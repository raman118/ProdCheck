import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, sourceEvidence } from "../helpers";
import { migrationFiles } from "./sql-schema";

const DROP_STATEMENT = /\bdrop\s+(?:table|column)\b[^;]*/gi;
const DELETE_STATEMENT = /\bdelete\s+from\b[^;]*/gi;
const ADD_NOT_NULL =
  /\balter\s+table\b[^;]*?\badd\s+(?:column\s+)?[\w"]+\s+[^;]*?\bnot\s+null\b[^;]*/gi;
const SET_NOT_NULL =
  /\balter\s+table\b[^;]*?\balter\s+column\s+[\w"]+\s+set\s+not\s+null\b[^;]*/gi;

interface MigrationIssue {
  readonly title: string;
  readonly message: string;
  readonly severity: "critical" | "high";
  readonly offset: number;
  readonly kind: string;
}

function addMatches(
  issues: MigrationIssue[],
  content: string,
  matcher: RegExp,
  issue: Omit<MigrationIssue, "offset">,
): void {
  for (const match of content.matchAll(matcher)) {
    const text = match[0] ?? "";
    if (issue.kind === "delete" && /\bwhere\b/i.test(text)) continue;
    if (issue.kind === "not-null" && /\bdefault\b/i.test(text)) continue;
    issues.push({ ...issue, offset: match.index ?? 0 });
  }
}

export const checkData004DestructiveMigration: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const findings: Finding[] = [];
  for (const [file, content] of migrationFiles(snapshot)) {
    const issues: MigrationIssue[] = [];
    addMatches(issues, content, DROP_STATEMENT, {
      title: "Migration drops an existing database object",
      message:
        "Dropping tables or columns can irreversibly remove production data. Use a staged migration and confirm backups before applying it.",
      severity: "high",
      kind: "drop",
    });
    addMatches(issues, content, DELETE_STATEMENT, {
      title: "Migration deletes rows without a WHERE clause",
      message:
        "An unbounded delete can remove every row in production. Add an explicit predicate or move the operation into a reviewed backfill.",
      severity: "critical",
      kind: "delete",
    });
    addMatches(issues, content, ADD_NOT_NULL, {
      title: "Migration adds a NOT NULL column without a default",
      message:
        "Existing rows cannot satisfy this new constraint. Add a nullable column, backfill it, then enforce NOT NULL in a later migration.",
      severity: "high",
      kind: "not-null",
    });
    addMatches(issues, content, SET_NOT_NULL, {
      title: "Migration enforces NOT NULL without a staged backfill",
      message:
        "Rows with null values can make this migration fail. Backfill and verify the column before enforcing the constraint.",
      severity: "high",
      kind: "not-null",
    });

    for (const issue of issues) {
      const line = content.slice(0, issue.offset).split("\n").length;
      findings.push(
        finding({
          id: `DATA-004:${file}:${line}:${issue.kind}`,
          checkId: "DATA-004",
          severity: issue.severity,
          category: "data",
          title: issue.title,
          explanation: issue.message,
          evidence: [sourceEvidence(snapshot, file, line)],
          confidence: issue.kind === "delete" ? 0.88 : 0.76,
        }),
      );
    }
  }
  return findings;
};
