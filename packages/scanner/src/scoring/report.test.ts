import { describe, expect, it } from "vitest";
import { calculateScore } from "./scorer";
import { createScanReport } from "./report";
import { detectStack } from "../detect/stack-detector";
import { testSnapshot } from "../checks/test-helper";

describe("createScanReport", () => {
  it("creates a validated report with injected timestamp and deterministic score", () => {
    const snapshot = testSnapshot({
      "package.json": '{"dependencies":{"next":"15.0.0"}}',
    });
    const report = createScanReport(
      snapshot,
      detectStack(snapshot),
      calculateScore([]),
      "skipped",
      "2026-10-06T00:00:00.000Z",
    );
    expect(report.repo.commitSha).toBe("a".repeat(40));
    expect(report.score).toBe(100);
    expect(report.scoreVersion).toBe(1);
    expect(report.scannedAt).toBe("2026-10-06T00:00:00.000Z");
  });
});
