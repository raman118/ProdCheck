export interface RepoSnapshot {
  readonly owner: string;
  readonly repo: string;
  readonly commitSha: string;
  readonly files: ReadonlyMap<string, string>;
  readonly lockfiles: ReadonlySet<string>;
  readonly dependencies: readonly LockedDependency[];
  readonly totalBytes: number;
}

export interface LockedDependency {
  readonly name: string;
  readonly version: string;
  readonly lockfile: string;
}

export interface GitHubRepoUrl {
  readonly owner: string;
  readonly repo: string;
  readonly branch?: string;
}

export interface SnapshotLimits {
  readonly maxArchiveBytes: number;
  readonly maxExpandedBytes: number;
  readonly maxFiles: number;
}

export const DEFAULT_SNAPSHOT_LIMITS: SnapshotLimits = {
  maxArchiveBytes: 50 * 1024 * 1024,
  maxExpandedBytes: 50 * 1024 * 1024,
  maxFiles: 5_000,
};
