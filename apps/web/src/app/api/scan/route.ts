import { ScanProgressSchema, ScanRequestSchema } from "@prodcheck/shared/scan";
import { scanRepository } from "@prodcheck/scanner";
import { allowScanRequest } from "../../../lib/rate-limit";
import { getScanStore } from "../../../lib/db/store";
import type { ScanStore } from "../../../lib/db/store-contract";
import { publicScanError } from "../../../lib/public-error";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_REQUEST_BYTES = 4_096;
const encoder = new TextEncoder();

async function readBody(request: Request): Promise<string> {
  if (!request.body) throw new Error("Request body is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await Promise.race([
        reader.read(),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error("Request body read timed out.")),
            5_000,
          );
        }),
      ]);
    } catch (error) {
      await reader.cancel();
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    const { done, value } = chunk;
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new Error("Request body exceeds 4 KiB.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function POST(request: Request): Promise<Response> {
  let store: ScanStore;
  try {
    store = await getScanStore();
  } catch {
    return Response.json(
      { error: "Scan service is temporarily unavailable." },
      { status: 503 },
    );
  }
  let allowed: boolean;
  try {
    allowed = await allowScanRequest(store, clientIp(request));
  } catch {
    return Response.json(
      { error: "Scan service is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!allowed) {
    return Response.json(
      { error: "Too many scans. Please try again in a few minutes." },
      {
        status: 429,
        headers: { "Retry-After": "600" },
      },
    );
  }
  let repositoryUrl: string;
  try {
    const raw = await readBody(request);
    const parsed: unknown = JSON.parse(raw);
    repositoryUrl = ScanRequestSchema.parse(parsed).repositoryUrl;
  } catch {
    return Response.json(
      { error: "Enter a valid JSON body with a public GitHub repository URL." },
      { status: 400 },
    );
  }

  let cancelled = false;
  const scanController = new AbortController();
  request.signal.addEventListener("abort", () => scanController.abort(), {
    once: true,
  });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const emit = (event: unknown) => {
        if (closed || cancelled) return;
        const validated = ScanProgressSchema.parse(event);
        controller.enqueue(
          encoder.encode(
            `event: progress\ndata: ${JSON.stringify(validated)}\n\n`,
          ),
        );
      };
      void scanRepository(repositoryUrl, {
        token: process.env.GITHUB_TOKEN,
        signal: scanController.signal,
        findCachedReport: async (snapshot) => {
          return store.getReport(
            snapshot.owner,
            snapshot.repo,
            snapshot.commitSha,
          );
        },
        onProgress: emit,
      })
        .then(async (report) => {
          const saved = await store.saveReport(report);
          emit({
            stage: "complete",
            message: "Production scan complete",
            progress: 100,
            report: saved.report,
          });
        })
        .catch((error: unknown) => {
          emit({
            stage: "error",
            message: publicScanError(error),
            progress: 0,
          });
        })
        .finally(() => {
          if (closed || cancelled) return;
          closed = true;
          controller.close();
        });
    },
    cancel() {
      cancelled = true;
      scanController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
