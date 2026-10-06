import { createHmac } from "node:crypto";
import type { ScanStore } from "./db/store-contract";

export const SCAN_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
export const SCAN_RATE_LIMIT_MAX_REQUESTS = 5;

export function ipFingerprint(
  ip: string,
  salt = process.env.RATE_LIMIT_SECRET ??
    process.env.DATABASE_URL ??
    "prodcheck-local-rate-limit",
): string {
  return createHmac("sha256", salt).update(ip).digest("hex");
}

export async function allowScanRequest(
  store: ScanStore,
  ip: string,
  now = Date.now(),
): Promise<boolean> {
  return store.consumeRateLimit(
    ipFingerprint(ip),
    now,
    SCAN_RATE_LIMIT_MAX_REQUESTS,
    SCAN_RATE_LIMIT_WINDOW_MS,
  );
}
