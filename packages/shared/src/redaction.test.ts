import { describe, expect, it } from "vitest";
import type { ScanReport } from "./score";
import { redactScanReport, redactSecretText } from "./redaction";

const secret = "ghp_abcdefghijklmnopqrstuvwxyz123456";

const report: ScanReport = {
  repo: { owner: "public", name: "demo", commitSha: "a".repeat(40) },
  scannedAt: "2026-10-06T00:00:00.000Z",
  stack: {
    node: true,
    frameworks: [],
    supabase: false,
    packageManager: "unknown",
    packageCount: 0,
    malformedPackageJson: false,
  },
  score: 80,
  scoreVersion: 1,
  scoreBand: "Good",
  categoryBreakdown: [],
  findings: [
    {
      id: "SEC-006:src/unsafe.ts:1",
      checkId: "SEC-006",
      severity: "high",
      category: "security",
      title: "Dangerous call includes a credential",
      explanation: "Do not expose this credential.",
      evidence: [
        {
          file: "src/unsafe.ts",
          lineStart: 1,
          lineEnd: 1,
          snippet: `const token = "${secret}";`,
        },
      ],
      fix: {
        description: "Replace the unsafe call.",
        patch: `-${secret}\n+safe()\n`,
        validated: true,
      },
      confidence: 0.8,
    },
  ],
  osvStatus: "skipped",
};

describe("report secret redaction", () => {
  it("redacts known formats and explicitly detected values everywhere in report text", () => {
    expect(redactSecretText(`token=${secret}`)).toBe("token=ghp_…[redacted]");
    const redacted = redactScanReport(report, [secret]);
    expect(redacted.findings[0]?.evidence[0]?.snippet).toContain(
      "ghp_…[redacted]",
    );
    expect(redacted.findings[0]?.fix).toBeUndefined();
    expect(JSON.stringify(redacted)).not.toContain(secret);
  });

  it("removes generic secret assignments without changing report scoring", () => {
    const value = redactScanReport({
      ...report,
      findings: [
        {
          ...report.findings[0]!,
          evidence: [
            {
              ...report.findings[0]!.evidence[0]!,
              snippet: 'const api_key = "ABCD1234567890xyz";',
            },
          ],
          fix: undefined,
        },
      ],
    });
    expect(value.findings[0]?.evidence[0]?.snippet).toContain(
      "ABCD…[redacted]",
    );
    expect(value.score).toBe(report.score);
    expect(value.scoreVersion).toBe(report.scoreVersion);
  });
});
