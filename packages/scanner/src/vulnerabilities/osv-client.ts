import type { LockedDependency } from "../snapshot/types";
import { OFFLINE_OSV_FIXTURE } from "./offline-fixture";

const OSV_QUERY_URL = "https://api.osv.dev/v1/querybatch";
const MAX_BATCH_SIZE = 500;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export interface OsvAdvisory {
  readonly packageName: string;
  readonly version: string;
  readonly id: string;
  readonly summary: string;
  readonly fixedVersion?: string;
}

export type OsvLookupStatus = "online" | "offline" | "skipped";

export interface OsvLookupResult {
  readonly advisories: readonly OsvAdvisory[];
  readonly status: OsvLookupStatus;
}

export interface OsvLookupOptions {
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
  readonly fallbackAdvisories?: readonly OsvAdvisory[];
  readonly signal?: AbortSignal;
}

interface OsvApiAdvisory {
  readonly id?: string;
  readonly summary?: string;
  readonly affected?: Array<{
    readonly package?: { readonly name?: string; readonly ecosystem?: string };
    readonly ranges?: Array<{
      readonly events?: Array<{ readonly fixed?: string }>;
    }>;
  }>;
}

interface OsvApiResponse {
  readonly results?: Array<{ readonly vulns?: OsvApiAdvisory[] }>;
}

async function readJsonCapped(response: Response): Promise<OsvApiResponse> {
  if (!response.body) throw new Error("OSV returned an empty response.");
  const length = response.headers.get("content-length");
  if (length && Number(length) > MAX_RESPONSE_BYTES)
    throw new Error("OSV response exceeded its size limit.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("OSV response exceeded its size limit.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as OsvApiResponse;
}

function getFixedVersion(advisory: OsvApiAdvisory): string | undefined {
  for (const affected of advisory.affected ?? []) {
    for (const range of affected.ranges ?? []) {
      const fixed = range.events?.find((event) => event.fixed)?.fixed;
      if (fixed) return fixed;
    }
  }
  return undefined;
}

function offlineFallback(
  dependencies: readonly LockedDependency[],
  fallback: readonly OsvAdvisory[],
): OsvAdvisory[] {
  const installed = new Set(
    dependencies.map(({ name, version }) => `${name}@${version}`),
  );
  return fallback.filter(({ packageName, version }) =>
    installed.has(`${packageName}@${version}`),
  );
}

export async function lookupOsvAdvisories(
  dependencies: readonly LockedDependency[],
  options: OsvLookupOptions = {},
): Promise<OsvLookupResult> {
  if (dependencies.length === 0) return { advisories: [], status: "skipped" };
  const fetchImpl = options.fetchImpl ?? fetch;
  const fallback = options.fallbackAdvisories ?? OFFLINE_OSV_FIXTURE;
  const advisories: OsvAdvisory[] = [];
  const deadline = Date.now() + (options.timeoutMs ?? 5_000);

  try {
    for (
      let offset = 0;
      offset < dependencies.length;
      offset += MAX_BATCH_SIZE
    ) {
      const batch = dependencies.slice(offset, offset + MAX_BATCH_SIZE);
      const controller = new AbortController();
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0)
        throw new Error("OSV lookup exceeded its time limit.");
      const timeout = setTimeout(() => controller.abort(), remainingMs);
      try {
        const response = await fetchImpl(OSV_QUERY_URL, {
          method: "POST",
          redirect: "error",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            queries: batch.map(({ name, version }) => ({
              package: { name, ecosystem: "npm" },
              version,
            })),
          }),
          signal: options.signal
            ? AbortSignal.any([controller.signal, options.signal])
            : controller.signal,
        });
        if (!response.ok) throw new Error("OSV advisory request failed.");
        const data = await readJsonCapped(response);
        for (const [index, result] of (data.results ?? []).entries()) {
          const dependency = batch[index];
          if (!dependency) continue;
          for (const advisory of result.vulns ?? []) {
            if (!advisory.id) continue;
            advisories.push({
              packageName: dependency.name,
              version: dependency.version,
              id: advisory.id,
              summary:
                advisory.summary ?? "Known vulnerability reported by OSV.",
              fixedVersion: getFixedVersion(advisory),
            });
          }
        }
      } finally {
        clearTimeout(timeout);
      }
    }
    return { advisories, status: "online" };
  } catch {
    if (options.signal?.aborted)
      throw new Error("Repository scan was canceled.");
    const combined = new Map<string, OsvAdvisory>();
    for (const advisory of [
      ...advisories,
      ...offlineFallback(dependencies, fallback),
    ]) {
      combined.set(
        `${advisory.packageName}@${advisory.version}:${advisory.id}`,
        advisory,
      );
    }
    return {
      advisories: [...combined.values()],
      status: "offline",
    };
  }
}
