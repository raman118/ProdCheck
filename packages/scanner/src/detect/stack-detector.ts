import type { RepoSnapshot } from "../snapshot/types";

export type Framework = "nextjs" | "react";

export interface DetectedStack {
  readonly node: boolean;
  readonly frameworks: readonly Framework[];
  readonly supabase: boolean;
  readonly packageManager: "pnpm" | "yarn" | "npm" | "bun" | "unknown";
  readonly packageCount: number;
  readonly malformedPackageJson: boolean;
}

function readPackageJson(manifest: string): {
  value: Record<string, unknown>;
  malformed: boolean;
} {
  try {
    const parsed: unknown = JSON.parse(manifest);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return { value: parsed as Record<string, unknown>, malformed: false };
    }
    return { value: {}, malformed: true };
  } catch {
    return { value: {}, malformed: true };
  }
}

function stringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

export function detectStack(snapshot: RepoSnapshot): DetectedStack {
  const manifests = [...snapshot.files.entries()].filter(
    ([path]) => path.split("/").at(-1) === "package.json",
  );
  const parsedManifests = manifests.map(([, content]) =>
    readPackageJson(content),
  );
  const dependencies = Object.assign(
    {},
    ...parsedManifests.map(({ value }) => ({
      ...stringRecord(value.dependencies),
      ...stringRecord(value.devDependencies),
      ...stringRecord(value.optionalDependencies),
      ...stringRecord(value.peerDependencies),
    })),
  );
  const hasNextConfig = [...snapshot.files.keys()].some((path) =>
    /^next\.config\.(?:cjs|js|mjs|mts|ts)$/.test(path.split("/").at(-1) ?? ""),
  );
  const frameworks: Framework[] = [];
  if (Object.hasOwn(dependencies, "next") || hasNextConfig)
    frameworks.push("nextjs");
  if (
    Object.hasOwn(dependencies, "react") ||
    Object.hasOwn(dependencies, "react-dom")
  ) {
    frameworks.push("react");
  }

  const packageManager =
    snapshot.lockfiles.has("pnpm-lock.yaml") ||
    snapshot.files.has("pnpm-workspace.yaml")
      ? "pnpm"
      : snapshot.lockfiles.has("yarn.lock")
        ? "yarn"
        : snapshot.lockfiles.has("bun.lock") ||
            snapshot.lockfiles.has("bun.lockb")
          ? "bun"
          : snapshot.lockfiles.has("package-lock.json") ||
              snapshot.lockfiles.has("npm-shrinkwrap.json")
            ? "npm"
            : "unknown";

  const supabase =
    Object.keys(dependencies).some((name) => name.startsWith("@supabase/")) ||
    [...snapshot.files.keys()].some(
      (path) =>
        path === "supabase/config.toml" ||
        path.startsWith("supabase/migrations/"),
    );

  return {
    node: manifests.length > 0,
    frameworks,
    supabase,
    packageManager,
    packageCount: Object.keys(dependencies).length,
    malformedPackageJson: parsedManifests.some(({ malformed }) => malformed),
  };
}
