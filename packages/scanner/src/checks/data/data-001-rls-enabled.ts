import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, sourceEvidence } from "../helpers";
import { migrationFiles } from "./sql-schema";

const CREATE_TABLE =
  /create\s+table\s+(?:if\s+not\s+exists\s+)?((?:[\w"]+\.)?[\w"]+)/gi;
const ENABLE_RLS =
  /alter\s+table\s+(?:if\s+exists\s+)?((?:[\w"]+\.)?[\w"]+)\s+enable\s+row\s+level\s+security/gi;

function normalizeTable(value: string): string {
  const parts = value.replaceAll('"', "").split(".");
  return parts.length === 1
    ? `public.${parts[0]?.toLowerCase()}`
    : `${parts.at(-2)?.toLowerCase()}.${parts.at(-1)?.toLowerCase()}`;
}

export const checkData001RlsEnabled: Check = (snapshot, context): Finding[] => {
  void context;
  const tables = new Map<string, { path: string; line: number }>();
  const rlsEnabled = new Set<string>();
  for (const [path, content] of migrationFiles(snapshot)) {
    for (const match of content.matchAll(CREATE_TABLE)) {
      const table = match[1];
      if (!table) continue;
      tables.set(normalizeTable(table), {
        path,
        line: content.slice(0, match.index ?? 0).split("\n").length,
      });
    }
    for (const match of content.matchAll(ENABLE_RLS)) {
      if (match[1]) rlsEnabled.add(normalizeTable(match[1]));
    }
  }

  const findings: Finding[] = [];
  for (const [table, evidence] of tables) {
    if (rlsEnabled.has(table)) continue;
    findings.push(
      finding({
        id: `DATA-001:${table}`,
        checkId: "DATA-001",
        severity: "high",
        category: "data",
        title: `Supabase table ${table} has RLS disabled`,
        explanation:
          "Supabase tables exposed through the Data API should have row-level security enabled. Add an RLS migration and policies for intended access.",
        evidence: [sourceEvidence(snapshot, evidence.path, evidence.line)],
        confidence: 0.83,
      }),
    );
  }
  return findings;
};
