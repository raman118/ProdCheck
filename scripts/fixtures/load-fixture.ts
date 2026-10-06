import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseLockfileDependencies } from "../../packages/scanner/src/snapshot/dependency-parser";
import type { RepoSnapshot } from "../../packages/scanner/src/snapshot/types";

const LOCKFILES = new Set([
  "bun.lock",
  "bun.lockb",
  "npm-shrinkwrap.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

async function collectFiles(
  root: string,
  current: string,
  output: string[],
): Promise<void> {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(current, entry.name);
    if (entry.isDirectory()) await collectFiles(root, path, output);
    else if (entry.isFile())
      output.push(relative(root, path).replaceAll("\\", "/"));
  }
}

export async function loadFixtureSnapshot(
  name: string,
  repositoryRoot = process.cwd(),
): Promise<RepoSnapshot> {
  const root = join(repositoryRoot, "scripts", "fixtures", name);
  const paths: string[] = [];
  await collectFiles(root, root, paths);
  paths.sort();
  const files = new Map<string, string>();
  const lockfiles = new Set<string>();
  const dependencies = new Map<string, RepoSnapshot["dependencies"][number]>();
  let totalBytes = 0;

  for (const path of paths) {
    const bytes = await readFile(join(root, path));
    const basename = path.split("/").at(-1)?.toLowerCase() ?? "";
    if (LOCKFILES.has(basename)) {
      lockfiles.add(path);
      if (basename !== "bun.lockb" && bytes.byteLength <= 4 * 1024 * 1024) {
        for (const dependency of parseLockfileDependencies(
          path,
          bytes.toString("utf8"),
        )) {
          dependencies.set(
            `${dependency.name}@${dependency.version}`,
            dependency,
          );
        }
      }
    } else {
      const content = bytes.toString("utf8");
      files.set(path, content);
      totalBytes += bytes.byteLength;
    }
  }

  return {
    owner: "prodcheck-fixture",
    repo: name,
    commitSha: "f".repeat(40),
    files,
    lockfiles,
    dependencies: [...dependencies.values()],
    totalBytes,
  };
}
