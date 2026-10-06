import { createPatch, createTwoFilesPatch } from "diff";
import type { Finding } from "@prodcheck/shared/finding";
import {
  findTableSchema,
  parseTableSchemas,
  migrationFiles,
} from "../checks/data/sql-schema";
import type { RepoSnapshot } from "../snapshot/types";
import { validatePatch } from "./patch-validator";

interface Candidate {
  path: string;
  before: string;
  after: string;
  description: string;
}

function unified(candidate: Candidate): string {
  return candidate.before === ""
    ? createTwoFilesPatch(
        "/dev/null",
        candidate.path,
        "",
        candidate.after,
        "",
        "",
      )
    : createPatch(
        candidate.path,
        candidate.before,
        candidate.after,
        "before",
        "after",
      );
}

function healthRoute(snapshot: RepoSnapshot): Candidate | undefined {
  const names = [...snapshot.files.keys()];
  if (
    names.some((path) =>
      /^(?:src\/)?app\/api\/health\/route\.(?:ts|js)$/.test(path),
    )
  )
    return;
  const appDir = names.some((path) => path.startsWith("src/app/"))
    ? "src/app"
    : "app";
  if (names.some((path) => path.startsWith(`${appDir}/`))) {
    const path = `${appDir}/api/health/route.ts`;
    return {
      path,
      before: "",
      after: `export function GET() {\n  return Response.json({ status: "ok" });\n}\n`,
      description: "Add a lightweight Next.js health endpoint.",
    };
  }
  if (names.some((path) => path.startsWith("pages/api/"))) {
    const path = "pages/api/health.ts";
    return {
      path,
      before: "",
      after: `import type { NextApiRequest, NextApiResponse } from "next";\n\nexport default function health(_request: NextApiRequest, response: NextApiResponse) {\n  response.status(200).json({ status: "ok" });\n}\n`,
      description: "Add a lightweight Next.js health endpoint.",
    };
  }
}

function corsFix(
  snapshot: RepoSnapshot,
  finding: Finding,
): Candidate | undefined {
  const evidence = finding.evidence[0];
  if (!evidence) return;
  const before = snapshot.files.get(evidence.file);
  if (!before || /(^|\n)\s*["']use client["']/.test(before)) return;
  const lines = before.split("\n");
  const index = evidence.lineStart - 1;
  const line = lines[index];
  if (!line || !line.includes("*")) return;
  const configuredOrigin =
    '(process.env.APP_ORIGIN ?? "http://localhost:3000")';
  const afterLine = line
    .replace(
      /set\s*\(\s*(["'])access-control-allow-origin\1\s*,\s*["']\*["']\s*\)/i,
      `set("access-control-allow-origin", ${configuredOrigin})`,
    )
    .replace(
      /(access-control-allow-origin\s*[:=]\s*)["']?\*["']?/i,
      `$1${configuredOrigin}`,
    )
    .replace(/(\borigin\s*:\s*)["']\*["']/i, `$1${configuredOrigin}`);
  if (afterLine === line) return;
  lines[index] = afterLine;
  return {
    path: evidence.file,
    before,
    after: lines.join("\n"),
    description: "Restrict CORS to the configured application origin.",
  };
}

function nextHeaders(snapshot: RepoSnapshot): Candidate | undefined {
  const path = [...snapshot.files.keys()].find((file) =>
    /^next\.config\.(?:js|mjs|cjs|ts)$/.test(file),
  );
  const before = path ? snapshot.files.get(path)! : "";
  if (
    !path &&
    ![...snapshot.files.keys()].some(
      (file) => file.startsWith("app/") || file.startsWith("src/app/"),
    )
  )
    return;
  const headers = `async () => [{ source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: "default-src 'self'; object-src 'none'; frame-ancestors 'none'" }, { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }, { key: "X-Frame-Options", value: "DENY" }] }]`;
  let after: string;
  if (!path) {
    after = `const nextConfig = {\n  headers: ${headers},\n};\n\nexport default nextConfig;\n`;
  } else {
    const assignment = /export\s+default\s+\{([\s\S]*?)\}\s*;?/m;
    const match = before.match(assignment);
    if (!match || match.index === undefined) return;
    const body = match[1] ?? "";
    if (/\bheaders\s*:/.test(body)) return;
    after =
      before.slice(0, match.index) +
      `export default {${body.trimEnd()}\n  headers: ${headers},\n};` +
      before.slice(match.index + match[0].length);
  }
  return {
    path: path ?? "next.config.ts",
    before,
    after,
    description: "Add a baseline set of browser security headers to Next.js.",
  };
}

function rlsMigration(
  snapshot: RepoSnapshot,
  finding: Finding,
): Candidate | undefined {
  const tableName = finding.title.match(/table ([\w.]+)/i)?.[1];
  if (!tableName) return;
  const tables = parseTableSchemas(snapshot);
  const table = findTableSchema(tables, tableName);
  const owner = ["owner_id", "user_id", "created_by"].find((column) =>
    table?.columns.has(column),
  );
  if (
    !table ||
    !owner ||
    (!snapshot.files.has("supabase/config.toml") &&
      !migrationFiles(snapshot).length)
  )
    return;
  const sqlTable = tableName.includes(".") ? tableName : `public.${tableName}`;
  let path = "supabase/migrations/99999999999999_prodcheck_enable_rls.sql";
  let suffix = 1;
  while (snapshot.files.has(path))
    path = `supabase/migrations/99999999999999_prodcheck_enable_rls_${suffix++}.sql`;
  const after = `alter table ${sqlTable} enable row level security;\n\ncreate policy "${tableName.split(".").at(-1)}_owner_access"\non ${sqlTable}\nfor all\nto authenticated\nusing (auth.uid() = ${owner})\nwith check (auth.uid() = ${owner});\n`;
  return {
    path,
    before: "",
    after,
    description: "Enable RLS and limit row access to the authenticated owner.",
  };
}

function dependencyPin(
  snapshot: RepoSnapshot,
  finding: Finding,
): Candidate | undefined {
  const evidence = finding.evidence[0];
  if (!evidence) return;
  const before = snapshot.files.get(evidence.file);
  if (!before) return;
  const match =
    finding.title.match(/dependency ([^ ]+)/i) ??
    finding.id.match(/QUA-004:[^:]+:(.+)$/);
  const name = match?.[1];
  if (!name) return;
  const locked = snapshot.dependencies.find(
    (dependency) => dependency.name === name,
  )?.version;
  if (!locked || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(locked)) return;
  let manifest: unknown;
  try {
    manifest = JSON.parse(before);
  } catch {
    return;
  }
  if (!manifest || typeof manifest !== "object") return;
  const record = manifest as Record<string, unknown>;
  let changed = false;
  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    const deps = record[section];
    if (
      deps &&
      typeof deps === "object" &&
      (deps as Record<string, unknown>)[name]
    ) {
      (deps as Record<string, unknown>)[name] = locked;
      changed = true;
    }
  }
  if (!changed) return;
  return {
    path: evidence.file,
    before,
    after: `${JSON.stringify(record, null, 2)}\n`,
    description: `Pin ${name} to the version recorded in the lockfile.`,
  };
}

function propose(
  snapshot: RepoSnapshot,
  finding: Finding,
): Candidate | undefined {
  if (finding.checkId === "SEC-004") return corsFix(snapshot, finding);
  if (finding.checkId === "SEC-005") return nextHeaders(snapshot);
  if (finding.checkId === "DATA-001") return rlsMigration(snapshot, finding);
  if (finding.checkId === "REL-004") return healthRoute(snapshot);
  if (finding.checkId === "QUA-004") return dependencyPin(snapshot, finding);
}

export function attachValidatedFixes(
  snapshot: RepoSnapshot,
  findings: readonly Finding[],
): Finding[] {
  return findings.map((finding) => {
    const candidate = propose(snapshot, finding);
    if (!candidate) return finding;
    const patch = unified(candidate);
    const result = validatePatch(patch, snapshot.files);
    return result.valid
      ? {
          ...finding,
          fix: { description: candidate.description, patch, validated: true },
        }
      : finding;
  });
}
