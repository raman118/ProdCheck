import { detectStack } from "../detect/stack-detector";
import type { RepoSnapshot } from "../snapshot/types";
import type { CheckContext } from "./contracts";

export function testSnapshot(files: Record<string, string>): RepoSnapshot {
  return {
    owner: "fixture",
    repo: "sample",
    commitSha: "a".repeat(40),
    files: new Map(Object.entries(files)),
    lockfiles: new Set(),
    dependencies: [],
    totalBytes: Object.values(files).reduce(
      (total, content) => total + content.length,
      0,
    ),
  };
}

export function testContext(snapshot: RepoSnapshot): CheckContext {
  return { stack: detectStack(snapshot), advisories: [], osvStatus: "skipped" };
}
