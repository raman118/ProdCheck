import { createClient } from "@libsql/client";
import type { Finding } from "@prodcheck/shared/finding";
import { ScanReportSchema, type ScanReport } from "@prodcheck/shared/score";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterEach, describe, expect, it } from "vitest";
import * as postgresSchema from "./postgres-schema";
import type { ScanStore } from "./store-contract";
import { createPostgresScanStore } from "./postgres-store";
import { createSqliteScanStore } from "./sqlite-store";

const finding = (id: string): Finding => ({
  id,
  checkId: "SEC-001",
  severity: "high",
  category: "security",
  title: `Finding ${id}`,
  explanation: "Test finding.",
  evidence: [],
  confidence: 0.9,
});

function makeReport(
  commitSha: string,
  scannedAt: string,
  findingIds: string[],
): ScanReport {
  return ScanReportSchema.parse({
    repo: { owner: "test-owner", name: "test-repo", commitSha },
    scannedAt,
    stack: {
      node: true,
      frameworks: ["nextjs"],
      supabase: false,
      packageManager: "pnpm",
      packageCount: 1,
      malformedPackageJson: false,
    },
    score: 80,
    scoreVersion: 1,
    scoreBand: "Good",
    categoryBreakdown: [],
    findings: findingIds.map(finding),
    osvStatus: "skipped",
  });
}

const firstReport = makeReport("1".repeat(40), "2026-10-06T00:00:00.000Z", [
  "SEC-001:first",
]);
const secondReport = makeReport("2".repeat(40), "2026-10-07T00:00:00.000Z", [
  "SEC-001:first",
  "SEC-001:new",
]);

describe.each(["sqlite", "postgres"] as const)("%s scan store", (dialect) => {
  let close: (() => Promise<void>) | undefined;
  afterEach(async () => close?.());

  async function makeStore(): Promise<{
    store: ScanStore;
    reinitialize: () => Promise<ScanStore>;
  }> {
    if (dialect === "sqlite") {
      const client = createClient({ url: "file::memory:" });
      close = async () => client.close();
      return {
        store: await createSqliteScanStore(client),
        reinitialize: () => createSqliteScanStore(client),
      };
    }
    const client = new PGlite();
    close = async () => client.close();
    const db = drizzle(client, { schema: postgresSchema });
    return {
      store: await createPostgresScanStore(db as never),
      reinitialize: () => createPostgresScanStore(db as never),
    };
  }

  it("bootstraps idempotently, caches immutable reports, and counts new findings", async () => {
    const { store, reinitialize } = await makeStore();
    await reinitialize();
    const first = await store.saveReport(firstReport);
    expect(first.created).toBe(true);
    expect(first.report.history).toEqual({
      newFindingsCount: 1,
      previousCommitSha: null,
    });

    const second = await store.saveReport(secondReport);
    expect(second.created).toBe(true);
    expect(second.report.history).toEqual({
      newFindingsCount: 1,
      previousCommitSha: firstReport.repo.commitSha,
    });

    const cached = await store.saveReport(
      makeReport(secondReport.repo.commitSha, "2026-10-08T00:00:00.000Z", []),
    );
    expect(cached.created).toBe(false);
    expect(cached.report.scannedAt).toBe(secondReport.scannedAt);
    expect(
      (
        await store.getReport(
          "test-owner",
          "test-repo",
          secondReport.repo.commitSha,
        )
      )?.findings,
    ).toHaveLength(2);
    expect(await store.listHistory("test-owner", "test-repo")).toMatchObject([
      { commitSha: secondReport.repo.commitSha, newFindingsCount: 1 },
      { commitSha: firstReport.repo.commitSha, newFindingsCount: 1 },
    ]);
  });

  it("enforces an atomic shared IP window and permits requests after expiry", async () => {
    const { store } = await makeStore();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(
        await store.consumeRateLimit("hashed-ip-a", 1_000, 5, 600_000),
      ).toBe(true);
    }
    expect(await store.consumeRateLimit("hashed-ip-a", 1_000, 5, 600_000)).toBe(
      false,
    );
    expect(await store.consumeRateLimit("hashed-ip-b", 1_000, 5, 600_000)).toBe(
      true,
    );
    expect(
      await store.consumeRateLimit("hashed-ip-a", 601_000, 5, 600_000),
    ).toBe(true);
  });
});
