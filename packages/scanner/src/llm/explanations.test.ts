import { describe, expect, it, vi } from "vitest";
import { calculateScore } from "../scoring/scorer";
import { createScanReport } from "../scoring/report";
import { detectStack } from "../detect/stack-detector";
import { finding } from "../checks/helpers";
import { testSnapshot } from "../checks/test-helper";
import { rewriteFindingExplanations } from "./explanations";

function report() {
  const snapshot = testSnapshot({ "package.json": "{}" });
  const findingResult = finding({
    id: "SEC-001:app/api/data/route.ts",
    checkId: "SEC-001",
    severity: "high",
    category: "security",
    title: "Public API route has no authentication guard",
    explanation: "Anyone can call this route without proving they are allowed.",
    evidence: [],
    confidence: 0.9,
  });
  return createScanReport(
    snapshot,
    detectStack(snapshot),
    calculateScore([findingResult]),
    "skipped",
    "2026-10-06T00:00:00.000Z",
  );
}

describe("optional LLM explanations", () => {
  it("stays offline when disabled and never changes the score", async () => {
    const fetchMock = vi.fn();
    const original = report();
    const result = await rewriteFindingExplanations(original, {
      enabled: false,
      openAiKey: "key",
      fetchImpl: fetchMock,
    });
    expect(result).toBe(original);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts bounded explanations for known findings only", async () => {
    const original = report();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  explanations: [
                    {
                      id: original.findings[0]!.id,
                      explanation:
                        "Without an authentication check, any visitor may access this route and its data.",
                    },
                  ],
                }),
              },
            },
          ],
        }),
      ),
    );
    const result = await rewriteFindingExplanations(original, {
      enabled: true,
      openAiKey: "key",
      fetchImpl: fetchMock,
    });
    expect(result.findings[0]?.explanation).toContain("any visitor");
    expect(result.score).toBe(original.score);
    expect(result.scoreVersion).toBe(original.scoreVersion);
  });

  it("supports the Anthropic Messages API adapter", async () => {
    const original = report();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                explanations: [
                  {
                    id: original.findings[0]!.id,
                    explanation:
                      "Without an authentication check, any visitor may access this route and its data.",
                  },
                ],
              }),
            },
          ],
        }),
      ),
    );
    const result = await rewriteFindingExplanations(original, {
      enabled: true,
      anthropicKey: "test-key",
      fetchImpl: fetchMock,
    });
    expect(result.findings[0]?.explanation).toContain("any visitor");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("falls back when output is malformed or names an unknown finding", async () => {
    const original = report();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  explanations: [
                    {
                      id: "other",
                      explanation:
                        "This is a long enough sentence to pass validation but has an unknown id.",
                    },
                  ],
                }),
              },
            },
          ],
        }),
      ),
    );
    expect(
      await rewriteFindingExplanations(original, {
        enabled: true,
        openAiKey: "key",
        fetchImpl: fetchMock,
      }),
    ).toEqual(original);
  });
});
