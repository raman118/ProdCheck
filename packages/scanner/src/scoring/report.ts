import { ScanReportSchema, type ScanReport } from "@prodcheck/shared/score";
import type { DetectedStack } from "../detect/stack-detector";
import type { RepoSnapshot } from "../snapshot/types";
import type { OsvLookupStatus } from "../vulnerabilities/osv-client";
import type { ScoredFindings } from "./scorer";

export function createScanReport(
  snapshot: RepoSnapshot,
  stack: DetectedStack,
  scored: ScoredFindings,
  osvStatus: OsvLookupStatus,
  scannedAt = new Date().toISOString(),
): ScanReport {
  return ScanReportSchema.parse({
    repo: {
      owner: snapshot.owner,
      name: snapshot.repo,
      commitSha: snapshot.commitSha,
    },
    scannedAt,
    stack,
    score: scored.score,
    scoreVersion: scored.scoreVersion,
    scoreBand: scored.band,
    categoryBreakdown: scored.categoryBreakdown,
    findings: scored.findings,
    osvStatus,
  });
}
