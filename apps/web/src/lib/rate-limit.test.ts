import { describe, expect, it, vi } from "vitest";
import { allowScanRequest, ipFingerprint } from "./rate-limit";

describe("scan rate limit", () => {
  it("stores a salted fingerprint instead of a raw IP", async () => {
    const consumeRateLimit = vi.fn(async () => true);
    const store = { consumeRateLimit } as never;
    await allowScanRequest(store, "203.0.113.4", 1_000);
    expect(consumeRateLimit).toHaveBeenCalledWith(
      ipFingerprint("203.0.113.4"),
      1_000,
      5,
      600_000,
    );
    expect(ipFingerprint("203.0.113.4", "salt")).not.toBe(
      ipFingerprint("203.0.113.4", "other-salt"),
    );
  });
});
