import type { LockedDependency } from "./types";

export const MAX_LOCKFILE_PARSE_BYTES = 4 * 1024 * 1024;
export const MAX_LOCKED_DEPENDENCIES = 20_000;

function addDependency(
  result: Map<string, LockedDependency>,
  name: string,
  version: string,
  lockfile: string,
): void {
  const normalizedName = name.replace(/^npm:/, "").trim();
  const normalizedVersion = version.trim().replace(/^v/, "");
  if (
    !normalizedName ||
    !normalizedVersion ||
    normalizedName.length > 214 ||
    normalizedVersion.length > 128 ||
    normalizedName.startsWith(".") ||
    /[\s/\\]/.test(normalizedVersion)
  )
    return;
  const key = `${normalizedName}@${normalizedVersion}`;
  if (result.size < MAX_LOCKED_DEPENDENCIES) {
    result.set(key, {
      name: normalizedName,
      version: normalizedVersion,
      lockfile,
    });
  }
}

function packageFromSelector(
  selector: string,
): { name: string; version: string } | undefined {
  const cleaned = selector
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/^\//, "");
  const at = cleaned.lastIndexOf("@");
  if (at <= 0 || at === cleaned.length - 1) return undefined;
  const name = cleaned.slice(0, at);
  const version =
    cleaned
      .slice(at + 1)
      .split("(")[0]
      ?.replace(/:$/, "") ?? "";
  if (
    !name ||
    !version ||
    version.startsWith("link:") ||
    version.startsWith("file:")
  )
    return undefined;
  return { name, version };
}

function parsePackageLock(
  content: string,
  lockfile: string,
): LockedDependency[] {
  const parsed: unknown = JSON.parse(content);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return [];
  const packages = (parsed as Record<string, unknown>).packages;
  if (
    typeof packages !== "object" ||
    packages === null ||
    Array.isArray(packages)
  )
    return [];
  const result = new Map<string, LockedDependency>();
  for (const [path, metadata] of Object.entries(packages)) {
    if (
      !path.includes("node_modules/") ||
      typeof metadata !== "object" ||
      metadata === null
    )
      continue;
    const version = (metadata as Record<string, unknown>).version;
    if (typeof version !== "string") continue;
    const name = path.split("node_modules/").at(-1);
    if (name) addDependency(result, name, version, lockfile);
  }
  return [...result.values()];
}

function parseBunLock(content: string, lockfile: string): LockedDependency[] {
  const parsed: unknown = JSON.parse(content);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return [];
  const packages = (parsed as Record<string, unknown>).packages;
  if (
    typeof packages !== "object" ||
    packages === null ||
    Array.isArray(packages)
  )
    return [];
  const result = new Map<string, LockedDependency>();
  for (const [name, raw] of Object.entries(packages)) {
    const tuple = Array.isArray(raw) ? raw : [raw];
    const identity = tuple.find(
      (part): part is string => typeof part === "string" && part.includes("@"),
    );
    const parsedIdentity = identity ? packageFromSelector(identity) : undefined;
    if (parsedIdentity)
      addDependency(
        result,
        parsedIdentity.name || name,
        parsedIdentity.version,
        lockfile,
      );
  }
  return [...result.values()];
}

function parsePnpmLock(content: string, lockfile: string): LockedDependency[] {
  const result = new Map<string, LockedDependency>();
  let inPackageSection = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^(?:packages|snapshots):\s*$/.test(line.trim())) {
      inPackageSection = true;
      continue;
    }
    if (/^[^\s#][^:]*:\s*(?:#.*)?$/.test(line) && !/^\s/.test(line)) {
      inPackageSection = false;
    }
    if (!inPackageSection || !/^\s{2,}[^\s#].*:\s*$/.test(line)) continue;
    const selector = line.trim().slice(0, -1);
    const dependency = packageFromSelector(selector);
    if (dependency)
      addDependency(result, dependency.name, dependency.version, lockfile);
    if (result.size >= MAX_LOCKED_DEPENDENCIES) break;
  }
  return [...result.values()];
}

function parseYarnLock(content: string, lockfile: string): LockedDependency[] {
  const result = new Map<string, LockedDependency>();
  let selectors: string[] = [];
  let version = "";
  const flush = () => {
    if (!version) return;
    for (const selector of selectors) {
      const dependency = packageFromSelector(selector);
      if (dependency) addDependency(result, dependency.name, version, lockfile);
    }
  };

  for (const line of content.split(/\r?\n/)) {
    if (line && !/^\s/.test(line) && line.trimEnd().endsWith(":")) {
      flush();
      selectors = line
        .trimEnd()
        .slice(0, -1)
        .split(/,\s*(?=["']?@?[A-Za-z0-9])/);
      version = "";
      continue;
    }
    const versionMatch = line.match(/^\s+version\s+["']?([^"'\s]+)["']?/);
    if (versionMatch?.[1]) version = versionMatch[1];
  }
  flush();
  return [...result.values()];
}

export function parseLockfileDependencies(
  path: string,
  content: string,
): LockedDependency[] {
  if (new TextEncoder().encode(content).byteLength > MAX_LOCKFILE_PARSE_BYTES)
    return [];
  const basename = path.split("/").at(-1)?.toLowerCase();
  try {
    if (
      basename === "package-lock.json" ||
      basename === "npm-shrinkwrap.json"
    ) {
      return parsePackageLock(content, path);
    }
    if (basename === "pnpm-lock.yaml") return parsePnpmLock(content, path);
    if (basename === "yarn.lock") return parseYarnLock(content, path);
    if (basename === "bun.lock") return parseBunLock(content, path);
  } catch {
    return [];
  }
  return [];
}
