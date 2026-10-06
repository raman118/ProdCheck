import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const scanReports = sqliteTable(
  "scan_reports",
  {
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    commitSha: text("commit_sha").notNull(),
    scannedAt: text("scanned_at").notNull(),
    score: integer("score").notNull(),
    report: text("report").notNull(),
    newFindingsCount: integer("new_findings_count").notNull().default(0),
    previousCommitSha: text("previous_commit_sha"),
  },
  (table) => [
    primaryKey({ columns: [table.owner, table.repo, table.commitSha] }),
  ],
);

export const scanRateLimits = sqliteTable("scan_rate_limits", {
  ipKey: text("ip_key").primaryKey(),
  windowStartedAt: integer("window_started_at_ms").notNull(),
  requestCount: integer("request_count").notNull(),
});
