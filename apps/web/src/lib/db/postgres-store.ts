import { Pool } from "pg";
import type { ScanHistoryItem, ScanReport } from "@prodcheck/shared/score";
import { ScanReportSchema } from "@prodcheck/shared/score";
import { redactScanReport } from "@prodcheck/shared/redaction";
import { and, desc, eq, lt, ne, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./postgres-schema";
import type { SaveReportResult, ScanStore } from "./store-contract";

type Database = NodePgDatabase<typeof schema>;
type Row = typeof schema.scanReports.$inferSelect;

async function ensureSchema(db: Database): Promise<void> {
  await db.execute(
    sql.raw(
      "CREATE TABLE IF NOT EXISTS prodcheck_schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
    ),
  );
  await db.execute(
    sql.raw(
      "INSERT INTO prodcheck_schema_migrations(version) VALUES (1) ON CONFLICT DO NOTHING",
    ),
  );
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS scan_reports (
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL,
    score INTEGER NOT NULL,
    report JSONB NOT NULL,
    new_findings_count INTEGER NOT NULL DEFAULT 0,
    previous_commit_sha TEXT,
    PRIMARY KEY (owner, repo, commit_sha)
  )`),
  );
  await db.execute(
    sql.raw(
      "CREATE INDEX IF NOT EXISTS scan_reports_history_idx ON scan_reports(owner, repo, scanned_at DESC)",
    ),
  );
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS scan_rate_limits (
    ip_key TEXT PRIMARY KEY,
    window_started_at_ms BIGINT NOT NULL,
    request_count INTEGER NOT NULL
  )`),
  );
  await db.execute(
    sql.raw(
      "CREATE INDEX IF NOT EXISTS scan_rate_limits_expiry_idx ON scan_rate_limits(window_started_at_ms)",
    ),
  );
  await db.execute(
    sql.raw(
      "INSERT INTO prodcheck_schema_migrations(version) VALUES (2) ON CONFLICT DO NOTHING",
    ),
  );
}

function parseReport(value: unknown): ScanReport {
  const parsed =
    typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  return redactScanReport(ScanReportSchema.parse(parsed));
}

function toHistory(row: Row): ScanHistoryItem {
  const report = parseReport(row.report);
  return {
    commitSha: row.commitSha,
    scannedAt: new Date(row.scannedAt).toISOString(),
    score: row.score,
    scoreBand: report.scoreBand,
    newFindingsCount: row.newFindingsCount,
  };
}

async function getRow(
  db: Database,
  owner: string,
  repo: string,
  commitSha: string,
): Promise<Row | undefined> {
  const [row] = await db
    .select()
    .from(schema.scanReports)
    .where(
      and(
        eq(schema.scanReports.owner, owner),
        eq(schema.scanReports.repo, repo),
        eq(schema.scanReports.commitSha, commitSha),
      ),
    )
    .limit(1);
  return row;
}

export async function createPostgresScanStore(
  db: Database,
): Promise<ScanStore> {
  await ensureSchema(db);
  let lastRateLimitCleanup = 0;
  return {
    async getReport(owner, repo, commitSha) {
      const row = await getRow(db, owner, repo, commitSha);
      return row ? parseReport(row.report) : undefined;
    },
    async saveReport(input: ScanReport): Promise<SaveReportResult> {
      input = redactScanReport(input);
      const existing = await getRow(
        db,
        input.repo.owner,
        input.repo.name,
        input.repo.commitSha,
      );
      if (existing)
        return { report: parseReport(existing.report), created: false };
      const [previous] = await db
        .select()
        .from(schema.scanReports)
        .where(
          and(
            eq(schema.scanReports.owner, input.repo.owner),
            eq(schema.scanReports.repo, input.repo.name),
            ne(schema.scanReports.commitSha, input.repo.commitSha),
          ),
        )
        .orderBy(
          desc(schema.scanReports.scannedAt),
          desc(schema.scanReports.commitSha),
        )
        .limit(1);
      const oldIds = new Set(
        previous
          ? parseReport(previous.report).findings.map(({ id }) => id)
          : [],
      );
      const newFindingsCount = input.findings.filter(
        ({ id }) => !oldIds.has(id),
      ).length;
      const report = ScanReportSchema.parse({
        ...input,
        history: {
          newFindingsCount,
          previousCommitSha: previous?.commitSha ?? null,
        },
      });
      const inserted = await db
        .insert(schema.scanReports)
        .values({
          owner: report.repo.owner,
          repo: report.repo.name,
          commitSha: report.repo.commitSha,
          scannedAt: report.scannedAt,
          score: report.score,
          report,
          newFindingsCount,
          previousCommitSha: previous?.commitSha ?? null,
        })
        .onConflictDoNothing()
        .returning({ commitSha: schema.scanReports.commitSha });
      if (inserted.length === 0) {
        const raced = await getRow(
          db,
          report.repo.owner,
          report.repo.name,
          report.repo.commitSha,
        );
        if (raced) return { report: parseReport(raced.report), created: false };
        throw new Error("Could not persist the scan report.");
      }
      return { report, created: true };
    },
    async listHistory(owner, repo, limit = 20) {
      const boundedLimit = Math.max(1, Math.min(50, Math.floor(limit)));
      const rows = await db
        .select()
        .from(schema.scanReports)
        .where(
          and(
            eq(schema.scanReports.owner, owner),
            eq(schema.scanReports.repo, repo),
          ),
        )
        .orderBy(
          desc(schema.scanReports.scannedAt),
          desc(schema.scanReports.commitSha),
        )
        .limit(boundedLimit);
      return rows.map(toHistory);
    },
    async consumeRateLimit(ipKey, nowMs, maxRequests, windowMs) {
      if (nowMs - lastRateLimitCleanup >= windowMs) {
        await db
          .delete(schema.scanRateLimits)
          .where(lt(schema.scanRateLimits.windowStartedAt, nowMs - windowMs));
        lastRateLimitCleanup = nowMs;
      }
      const [row] = await db
        .insert(schema.scanRateLimits)
        .values({ ipKey, windowStartedAt: nowMs, requestCount: 1 })
        .onConflictDoUpdate({
          target: schema.scanRateLimits.ipKey,
          set: {
            windowStartedAt: sql`CASE WHEN ${schema.scanRateLimits.windowStartedAt} + ${windowMs} <= ${nowMs} THEN ${nowMs} ELSE ${schema.scanRateLimits.windowStartedAt} END`,
            requestCount: sql`CASE WHEN ${schema.scanRateLimits.windowStartedAt} + ${windowMs} <= ${nowMs} THEN 1 ELSE ${schema.scanRateLimits.requestCount} + 1 END`,
          },
        })
        .returning({ requestCount: schema.scanRateLimits.requestCount });
      return (row?.requestCount ?? maxRequests + 1) <= maxRequests;
    },
  };
}

export function createPostgresClient(connectionString: string): Pool {
  return new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
}

export function drizzlePostgres(pool: Pool) {
  return drizzle(pool, { schema });
}
