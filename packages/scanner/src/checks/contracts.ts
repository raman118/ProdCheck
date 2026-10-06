import type { Finding } from "@prodcheck/shared/finding";
import type { DetectedStack } from "../detect/stack-detector";
import type { RepoSnapshot } from "../snapshot/types";
import type {
  OsvAdvisory,
  OsvLookupStatus,
} from "../vulnerabilities/osv-client";

export interface CheckContext {
  readonly stack: DetectedStack;
  readonly advisories: readonly OsvAdvisory[];
  readonly osvStatus: OsvLookupStatus;
}

export type Check = (
  snapshot: RepoSnapshot,
  context: CheckContext,
) => Finding[];
