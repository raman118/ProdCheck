import { describe, expect, it } from "vitest";
import { median, summarizeBenchmark } from "./benchmark-metrics";

describe("benchmark metrics", () => {
  it("summarizes successful scans, critical prevalence, common checks, median and verified patches", () => {
    const report = (severity: "critical" | "low", checkId: string) => ({
      findings: [
        { severity, checkId, fix: { validated: true } },
        { severity: "low" as const, checkId: "QUA-001", fix: undefined },
      ],
    });
    const result = summarizeBenchmark([
      {
        url: "a",
        durationMs: 10,
        report: report("critical", "SEC-001") as never,
      },
      { url: "b", durationMs: 30, report: report("low", "SEC-001") as never },
      { url: "c", durationMs: 99, error: "failed" },
    ]);
    expect(result.scanned).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.criticalFindingPercent).toBe(50);
    expect(result.topFindings[0]).toEqual({ checkId: "QUA-001", count: 2 });
    expect(result.medianScanTimeMs).toBe(20);
    expect(result.patchValidationRate).toBe(100);
  });

  it("returns an empty median for no values", () => expect(median([])).toBe(0));
});
