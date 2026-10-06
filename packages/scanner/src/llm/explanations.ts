import type { ScanReport } from "@prodcheck/shared/score";

interface ExplanationRewrite {
  readonly id: string;
  readonly explanation: string;
}

function parseRewrites(value: unknown): ExplanationRewrite[] | undefined {
  if (!value || typeof value !== "object") return;
  const explanations = (value as { explanations?: unknown }).explanations;
  if (!Array.isArray(explanations) || explanations.length > 100) return;
  const output: ExplanationRewrite[] = [];
  for (const item of explanations) {
    if (!item || typeof item !== "object") return;
    const { id, explanation } = item as Record<string, unknown>;
    if (
      typeof id !== "string" ||
      id.length < 1 ||
      id.length > 200 ||
      typeof explanation !== "string" ||
      explanation.length < 20 ||
      explanation.length > 500
    )
      return;
    output.push({ id, explanation });
  }
  return output;
}

export interface ExplanationOptions {
  readonly enabled?: boolean;
  readonly openAiKey?: string;
  readonly anthropicKey?: string;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
}

function boundedTimeout(signal?: AbortSignal): {
  signal: AbortSignal;
  clear: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_000);
  const combined = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;
  return { signal: combined, clear: () => clearTimeout(timer) };
}

function getText(
  data: unknown,
  provider: "openai" | "anthropic",
): string | undefined {
  if (!data || typeof data !== "object") return;
  const record = data as Record<string, unknown>;
  if (provider === "openai") {
    const choice = (
      record.choices as Array<{ message?: { content?: unknown } }> | undefined
    )?.[0];
    return typeof choice?.message?.content === "string"
      ? choice.message.content
      : undefined;
  }
  const block = (
    record.content as Array<{ type?: string; text?: unknown }> | undefined
  )?.[0];
  return block?.type === "text" && typeof block.text === "string"
    ? block.text
    : undefined;
}

export async function rewriteFindingExplanations(
  report: ScanReport,
  options: ExplanationOptions = {},
): Promise<ScanReport> {
  if (options.enabled !== true || (!options.openAiKey && !options.anthropicKey))
    return report;
  const provider = options.anthropicKey ? "anthropic" : "openai";
  const key = options.anthropicKey ?? options.openAiKey!;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeout = boundedTimeout(options.signal);
  try {
    const input = report.findings.map(
      ({ id, checkId, severity, title, explanation }) => ({
        id,
        checkId,
        severity,
        title,
        explanation,
      }),
    );
    const instructions = `Rewrite each finding explanation in plain English. Return JSON with an explanations array of {id, explanation}. Preserve ids. Do not make new claims or suggest changes to severity or score. Input: ${JSON.stringify(input).slice(0, 24_000)}`;
    const response =
      provider === "openai"
        ? await fetchImpl("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            redirect: "error",
            signal: timeout.signal,
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
              temperature: 0,
              max_tokens: 4_000,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content:
                    "Rewrite only provided security finding explanations. Return valid JSON.",
                },
                { role: "user", content: instructions },
              ],
            }),
          })
        : await fetchImpl("https://api.anthropic.com/v1/messages", {
            method: "POST",
            redirect: "error",
            signal: timeout.signal,
            headers: {
              "x-api-key": key,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
              max_tokens: 4_000,
              system:
                "Rewrite only provided security finding explanations. Return valid JSON.",
              messages: [{ role: "user", content: instructions }],
            }),
          });
    if (!response.ok) return report;
    const data: unknown = await response.json();
    const text = getText(data, provider);
    if (!text || text.length > 32_000) return report;
    const rewrites = parseRewrites(JSON.parse(text));
    if (!rewrites) return report;
    const expected = new Set(report.findings.map(({ id }) => id));
    if (rewrites.some(({ id }) => !expected.has(id))) return report;
    const byId = new Map(
      rewrites.map(({ id, explanation }) => [id, explanation]),
    );
    return {
      ...report,
      findings: report.findings.map((finding) => ({
        ...finding,
        explanation: byId.get(finding.id) ?? finding.explanation,
      })),
    };
  } catch {
    if (options.signal?.aborted)
      throw new Error("Repository scan was canceled.");
    return report;
  } finally {
    timeout.clear();
  }
}
