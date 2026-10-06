import {
  FindingSchema,
  type Category,
  type Finding,
  type Severity,
} from "@prodcheck/shared/finding";
import { Project, SyntaxKind, type SourceFile } from "ts-morph";
import type { RepoSnapshot } from "../snapshot/types";

export interface FindingInput {
  readonly id: string;
  readonly checkId: string;
  readonly severity: Severity;
  readonly category: Category;
  readonly title: string;
  readonly explanation: string;
  readonly evidence?: Finding["evidence"];
  readonly confidence?: number;
}

export function finding(input: FindingInput): Finding {
  return FindingSchema.parse({
    ...input,
    evidence: input.evidence ?? [],
    confidence: input.confidence ?? 0.8,
  });
}

export function sourceEvidence(
  snapshot: RepoSnapshot,
  file: string,
  lineStart: number,
  snippet?: string,
): Finding["evidence"][number] {
  const sourceLine =
    snapshot.files.get(file)?.split(/\r?\n/)[lineStart - 1] ?? "";
  return {
    file,
    lineStart,
    lineEnd: lineStart,
    snippet: snippet ?? sourceLine.trim().slice(0, 300),
  };
}

export function snapshotPath(
  snapshot: RepoSnapshot,
  sourceFilePath: string,
): string {
  const normalized = sourceFilePath.replace(/\\/g, "/");
  return (
    [...snapshot.files.keys()].find(
      (path) => normalized === path || normalized.endsWith(`/${path}`),
    ) ?? normalized.replace(/^\/+/, "")
  );
}

export function sourceFiles(
  snapshot: RepoSnapshot,
  shouldParse: (path: string, text: string) => boolean,
): SourceFile[] {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true, noResolve: true, jsx: 1 },
  });
  const files: SourceFile[] = [];
  for (const [path, content] of snapshot.files) {
    if (!shouldParse(path, content) || content.length > 1_000_000) continue;
    try {
      files.push(project.createSourceFile(path, content, { overwrite: true }));
    } catch {
      // An unsupported or malformed source file cannot stop checks for the rest of the snapshot.
    }
  }
  return files;
}

export function jsTsFile(path: string): boolean {
  return /\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/i.test(path);
}

export function isExportedVariable(
  declaration: ReturnType<SourceFile["getVariableDeclarations"]>[number],
): boolean {
  return (
    declaration
      .getParentIfKind(SyntaxKind.VariableDeclarationList)
      ?.getParentIfKind(SyntaxKind.VariableStatement)
      ?.isExported() ?? false
  );
}

export function findLine(content: string, matcher: RegExp): number {
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((line) => matcher.test(line));
  return index < 0 ? 1 : index + 1;
}

export function routeFiles(snapshot: RepoSnapshot): string[] {
  return [...snapshot.files.keys()].filter((path) => {
    const parts = path.split("/");
    const apiIndex = parts.lastIndexOf("api");
    if (apiIndex < 0 || apiIndex === parts.length - 1) return false;
    const basename = parts.at(-1) ?? "";
    return (
      /^(?:route\.)[cm]?[jt]sx?$/i.test(basename) ||
      (parts.slice(0, apiIndex).includes("pages") &&
        /\.[cm]?[jt]sx?$/i.test(basename))
    );
  });
}

export function countLineMatches(content: string, matcher: RegExp): number[] {
  return content.split(/\r?\n/).flatMap((line, index) => {
    matcher.lastIndex = 0;
    return matcher.test(line) ? [index + 1] : [];
  });
}
