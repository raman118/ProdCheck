import {
  bigint,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { ScanReport } from "@prodcheck/shared/score";

export const scanReports = pgTable(
  "scan_reports",
  {
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    commitSha: text("commit_sha").notNull(),
    scannedAt: timestamp("scanned_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    score: integer("score").notNull(),
    report: jsonb("report").$type<ScanReport>().notNull(),
    newFindingsCount: integer("new_findings_count").notNull().default(0),
    previousCommitSha: text("previous_commit_sha"),
  },
  (table) => [
    primaryKey({ columns: [table.owner, table.repo, table.commitSha] }),
  ],
);

export const scanRateLimits = pgTable("scan_rate_limits", {
  ipKey: text("ip_key").primaryKey(),
  windowStartedAt: bigint("window_started_at_ms", { mode: "number" }).notNull(),
  requestCount: integer("request_count").notNull(),
});
