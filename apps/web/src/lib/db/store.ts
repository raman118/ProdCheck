import "server-only";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createPostgresClient,
  createPostgresScanStore,
  drizzlePostgres,
} from "./postgres-store";
import { createSqliteClient, createSqliteScanStore } from "./sqlite-store";
import type { ScanStore } from "./store-contract";

declare global {
  var __prodcheckStore: Promise<ScanStore> | undefined;
}

async function initializeStore(): Promise<ScanStore> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const pool = createPostgresClient(databaseUrl);
    try {
      return await createPostgresScanStore(drizzlePostgres(pool));
    } catch (error) {
      await pool.end();
      throw error;
    }
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL must be configured for production persistence.",
    );
  }
  const dataDirectory = resolve(process.cwd(), "../../.data");
  await mkdir(dataDirectory, { recursive: true });
  const url =
    process.env.SQLITE_DATABASE_URL ?? "file:../../.data/prodcheck.db";
  return createSqliteScanStore(createSqliteClient(url));
}

export function getScanStore(): Promise<ScanStore> {
  globalThis.__prodcheckStore ??= initializeStore();
  return globalThis.__prodcheckStore;
}
