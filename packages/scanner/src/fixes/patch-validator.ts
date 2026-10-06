import { applyPatch, parsePatch } from "diff";
import {
  createSourceFile,
  ScriptKind,
  ScriptTarget,
  type SourceFile,
} from "typescript";

export interface PatchValidation {
  readonly valid: boolean;
  readonly reason?: string;
  readonly files?: ReadonlyMap<string, string>;
}

const MAX_PATCH_BYTES = 32 * 1024;
const MAX_TOUCHED_FILES = 5;
const ALLOWED_PATH =
  /^(?:\.gitignore|\.env\.example|(?:src\/)?(?:app\/api\/[\w/-]+\/route\.(?:ts|js)|pages\/api\/[\w/-]+\.(?:ts|js)|next\.config\.(?:js|mjs|cjs|ts)|supabase\/migrations\/[\w.-]+\.sql|(?:src\/)?package\.json))$/;
const NETWORK_CALL =
  /\bfetch\s*\(|\baxios\s*\.|\bXMLHttpRequest\b|\bWebSocket\s*\(|\bhttps?\.request\s*\(/i;

function safePath(path: string): boolean {
  return (
    !path.startsWith("/") &&
    !path.includes("\\") &&
    !path.split("/").includes("..") &&
    ALLOWED_PATH.test(path)
  );
}

export function validatePatch(
  patch: string,
  snapshotFiles: ReadonlyMap<string, string>,
): PatchValidation {
  if (new TextEncoder().encode(patch).byteLength > MAX_PATCH_BYTES)
    return { valid: false, reason: "Patch exceeds the 32 KiB limit." };
  let parsed;
  try {
    parsed = parsePatch(patch);
  } catch {
    return { valid: false, reason: "Patch is not valid unified diff text." };
  }
  if (parsed.length === 0 || parsed.length > MAX_TOUCHED_FILES)
    return { valid: false, reason: "Patch must change between 1 and 5 files." };

  const updated = new Map<string, string>();
  for (const filePatch of parsed) {
    const target = (filePatch.newFileName ?? "").replace(/^b\//, "");
    const source = (filePatch.oldFileName ?? "").replace(/^a\//, "");
    const path = target === "/dev/null" ? source : target;
    if (!safePath(path))
      return {
        valid: false,
        reason: `Patch path is not allowed: ${path || "(empty)"}.`,
      };
    const before = snapshotFiles.get(path);
    if (before === undefined && source !== "/dev/null")
      return {
        valid: false,
        reason: `Patch source file does not exist: ${path}.`,
      };
    if (before !== undefined && source === "/dev/null")
      return {
        valid: false,
        reason: `Patch would overwrite existing file: ${path}.`,
      };
    const after = applyPatch(before ?? "", filePatch);
    if (after === false)
      return {
        valid: false,
        reason: `Patch does not apply cleanly to ${path}.`,
      };
    const addedLines = (filePatch.hunks ?? [])
      .flatMap((hunk) => hunk.lines)
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"));
    if (addedLines.some((line) => NETWORK_CALL.test(line)))
      return { valid: false, reason: `Patch adds a network call in ${path}.` };
    if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(path)) {
      const sourceFile = createSourceFile(
        path,
        after,
        ScriptTarget.Latest,
        true,
        /\.tsx$/.test(path) || /\.jsx$/.test(path)
          ? ScriptKind.TSX
          : ScriptKind.TS,
      );
      const parseDiagnostics = (
        sourceFile as SourceFile & { parseDiagnostics?: readonly unknown[] }
      ).parseDiagnostics;
      if ((parseDiagnostics?.length ?? 0) > 0)
        return {
          valid: false,
          reason: `Patched source does not parse: ${path}.`,
        };
    }
    updated.set(path, after);
  }
  return { valid: true, files: updated };
}
