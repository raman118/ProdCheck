import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, jsTsFile, sourceEvidence } from "../helpers";
import { findTableSchema, parseTableSchemas } from "./sql-schema";

interface QueryUse {
  readonly table: string;
  readonly column: string;
  readonly offset: number;
}

function findQueryUses(path: string, content: string): QueryUse[] {
  const uses: QueryUse[] = [];
  const supabaseQuery =
    /\.from\s*\(\s*["']([\w-]+)["']\s*\)([\s\S]{0,600}?)\.(?:eq|neq|gt|gte|lt|lte|like|ilike|order|in)\s*\(\s*["']([\w-]+)["']/gi;
  for (const match of content.matchAll(supabaseQuery)) {
    if (match[1] && match[3])
      uses.push({
        table: match[1],
        column: match[3],
        offset: match.index ?? 0,
      });
  }

  if (path.toLowerCase().endsWith(".sql") || jsTsFile(path)) {
    const sqlFilter =
      /\bfrom\s+((?:[\w"]+\.)?[\w"]+)[^;\n]{0,300}?\bwhere\s+((?:[\w"]+\.)?[\w"]+)\s*(?:=|<>|!=|>|<|like\b|in\s*\()/gi;
    for (const match of content.matchAll(sqlFilter)) {
      if (match[1] && match[2])
        uses.push({
          table: match[1].replaceAll('"', ""),
          column: match[2].split(".").at(-1) ?? match[2],
          offset: match.index ?? 0,
        });
    }

    const sqlJoin =
      /\bjoin\s+((?:[\w"]+\.)?[\w"]+)(?:\s+(?:as\s+)?\w+)?\s+on\s+((?:[\w"]+\.)?[\w"]+)\s*=\s*((?:[\w"]+\.)?[\w"]+)/gi;
    for (const match of content.matchAll(sqlJoin)) {
      const joinedTable = match[1]?.replaceAll('"', "");
      if (!joinedTable) continue;
      for (const reference of [match[2], match[3]]) {
        if (!reference) continue;
        const parts = reference.replaceAll('"', "").split(".");
        const table =
          parts.length > 1 ? (parts.at(-2) ?? joinedTable) : joinedTable;
        const column = parts.at(-1);
        if (column) uses.push({ table, column, offset: match.index ?? 0 });
      }
    }
  }
  return uses;
}

export const checkData003MissingIndex: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const schemas = parseTableSchemas(snapshot);
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const [file, content] of snapshot.files) {
    for (const usage of findQueryUses(file, content)) {
      const table = findTableSchema(schemas, usage.table);
      const column = usage.column.replaceAll('"', "").toLowerCase();
      if (
        !table ||
        !table.columns.has(column) ||
        table.indexedColumns.has(column)
      )
        continue;
      const line = content.slice(0, usage.offset).split("\n").length;
      const key = `${file}:${line}:${usage.table}:${column}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push(
        finding({
          id: `DATA-003:${key}`,
          checkId: "DATA-003",
          severity: "medium",
          category: "data",
          title: `Query filters ${usage.table}.${column} without an index`,
          explanation:
            "Filtering an unindexed column can become slow as the table grows. Add a migration index if this query is on a common path.",
          evidence: [sourceEvidence(snapshot, file, line)],
          confidence: 0.66,
        }),
      );
    }
  }
  return findings;
};
