export const SCANNER_PIPELINE = [
  "snapshot",
  "stack",
  "checks",
  "score",
  "report",
] as const;

export { createSnapshotFromTar, gunzipCapped } from "./snapshot/archive";
export { fetchGitHubSnapshot } from "./snapshot/fetch-github";
export { parseGitHubRepoUrl } from "./snapshot/github-url";
export type { DetectedStack, Framework } from "./detect/stack-detector";
export { detectStack } from "./detect/stack-detector";
export type {
  GitHubRepoUrl,
  RepoSnapshot,
  SnapshotLimits,
} from "./snapshot/types";
export { ALL_CHECKS } from "./checks";
export type { Check, CheckContext } from "./checks";
export { lookupOsvAdvisories } from "./vulnerabilities/osv-client";
export type {
  OsvAdvisory,
  OsvLookupResult,
  OsvLookupStatus,
} from "./vulnerabilities/osv-client";
export type { LockedDependency } from "./snapshot/types";
export { parseLockfileDependencies } from "./snapshot/dependency-parser";
export {
  calculateScore,
  sortFindings,
  CATEGORY_DEDUCTION_CAPS,
  SCORE_VERSION,
  SEVERITY_DEDUCTIONS,
} from "./scoring/scorer";
export { createScanReport } from "./scoring/report";
export { attachValidatedFixes } from "./fixes/fix-generator";
export { validatePatch } from "./fixes/patch-validator";
export { scanRepository } from "./pipeline/scan-repository";
export type { ScanRepositoryOptions } from "./pipeline/scan-repository";
export { rewriteFindingExplanations } from "./llm/explanations";
