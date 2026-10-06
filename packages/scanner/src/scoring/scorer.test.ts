import { describe, expect, it } from "vitest";
import type { Finding } from "@prodcheck/shared/finding";
import { calculateScore } from "./scorer";

function makeFinding(
  id: string,
  checkId: string,
  severity: Finding["severity"],
  category: Finding["category"] = "security",
): Finding {
  return {
    id,
    checkId,
    severity,
    category,
    title: id,
    explanation: id,
    evidence: [],
    confidence: 0.8,
  };
}

describe("calculateScore", () => {
  it("starts at 100 and returns every category for a clean repository", () => {
    const result = calculateScore([]);
    expect(result.score).toBe(100);
    expect(result.band).toBe("Production ready");
    expect(result.categoryBreakdown).toHaveLength(5);
  });

  it("applies severity weights and per-check diminishing returns independent of input order", () => {
    const findings = [
      makeFinding("one", "SEC-001", "critical"),
      makeFinding("two", "SEC-001", "critical"),
      makeFinding("three", "SEC-001", "high"),
      makeFinding("four", "REL-001", "medium", "reliability"),
    ];
    const forward = calculateScore(findings);
    const reversed = calculateScore([...findings].reverse());
    expect(forward.score).toBe(72);
    expect(forward).toEqual(reversed);
  });

  it("caps deductions by category and sorts findings by severity", () => {
    const manyFindings = Array.from({ length: 60 }, (_, index) =>
      makeFinding(`finding-${index}`, `SEC-00${(index % 6) + 1}`, "critical"),
    );
    const result = calculateScore([
      makeFinding("low", "REL-001", "low", "reliability"),
      ...manyFindings,
    ]);
    expect(result.categoryBreakdown[0]?.deduction).toBe(40);
    expect(result.findings[0]?.severity).toBe("critical");
    expect(result.score).toBe(59);
  });
});
