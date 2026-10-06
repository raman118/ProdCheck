import { describe, expect, it } from "vitest";
import { checkRel004HealthEndpoint } from "./rel-004-health-endpoint";
import { testContext, testSnapshot } from "../test-helper";

describe("REL-004 health endpoint", () => {
  it("reports when no health route exists", () => {
    const snapshot = testSnapshot({ "src/app.ts": "export const app = {};" });
    expect(
      checkRel004HealthEndpoint(snapshot, testContext(snapshot)),
    ).toHaveLength(1);
  });

  it("recognizes Next.js and Express health routes", () => {
    const next = testSnapshot({
      "app/api/health/route.ts": "export function GET() {}",
    });
    const express = testSnapshot({
      "src/server.ts": 'app.get("/health", handler);',
    });
    expect(checkRel004HealthEndpoint(next, testContext(next))).toEqual([]);
    expect(checkRel004HealthEndpoint(express, testContext(express))).toEqual(
      [],
    );
  });
});
