import { describe, expect, it } from "vitest";
import { checkRel001RateLimit } from "./rel-001-rate-limit";
import { testContext, testSnapshot } from "../test-helper";

describe("REL-001 rate limiting", () => {
  it("reports public auth routes without a limiter", () => {
    const snapshot = testSnapshot({
      "app/api/auth/login/route.ts":
        "export async function POST() { return Response.json({ ok: true }); }",
    });
    expect(checkRel001RateLimit(snapshot, testContext(snapshot))).toHaveLength(
      1,
    );
  });

  it("recognizes a route-local limiter and does not flag authenticated private routes", () => {
    const snapshot = testSnapshot({
      "app/api/auth/login/route.ts":
        "rateLimit(); export async function POST() {}",
      "app/api/account/route.ts":
        "export async function GET() { await requireAuth(); }",
    });
    expect(checkRel001RateLimit(snapshot, testContext(snapshot))).toEqual([]);
  });

  it("does not require rate limiting on the lightweight health endpoint", () => {
    const snapshot = testSnapshot({
      "app/api/health/route.ts":
        "export function GET() { return Response.json({ status: 'ok' }); }",
    });
    expect(checkRel001RateLimit(snapshot, testContext(snapshot))).toEqual([]);
  });
});
