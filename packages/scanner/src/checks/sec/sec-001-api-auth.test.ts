import { describe, expect, it } from "vitest";
import { checkSec001ApiAuth } from "./sec-001-api-auth";
import { testContext, testSnapshot } from "../test-helper";

describe("SEC-001 API authentication", () => {
  it("reports missing auth and escalates admin handlers", () => {
    const snapshot = testSnapshot({
      "app/api/orders/route.ts":
        "export async function POST() { return Response.json({ ok: true }); }",
      "app/api/admin/users/route.ts":
        "export async function GET() { return Response.json([]); }",
    });
    const findings = checkSec001ApiAuth(snapshot, testContext(snapshot));
    expect(findings.map(({ severity }) => severity)).toEqual([
      "high",
      "critical",
    ]);
    expect(findings).toHaveLength(2);
  });

  it("does not report a handler with a visible auth check", () => {
    const snapshot = testSnapshot({
      "app/api/profile/route.ts":
        "export async function GET() { const user = await requireAuth(); return Response.json(user); }",
    });
    expect(checkSec001ApiAuth(snapshot, testContext(snapshot))).toEqual([]);
  });

  it("allows an intentionally public health route", () => {
    const snapshot = testSnapshot({
      "app/api/health/route.ts":
        "export function GET() { return Response.json({ status: 'ok' }); }",
    });
    expect(checkSec001ApiAuth(snapshot, testContext(snapshot))).toEqual([]);
  });
});
