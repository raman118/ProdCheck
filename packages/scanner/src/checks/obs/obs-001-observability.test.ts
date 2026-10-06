import { describe, expect, it } from "vitest";
import { checkObs001Observability } from "./obs-001-observability";
import { testContext, testSnapshot } from "../test-helper";

describe("OBS-001 observability", () => {
  it("reports missing structured logging and error tracking", () => {
    const snapshot = testSnapshot({
      "src/app.ts": "export function run() { return true; }",
    });
    expect(
      checkObs001Observability(snapshot, testContext(snapshot)),
    ).toHaveLength(2);
  });

  it("recognizes a structured logger and Sentry integration", () => {
    const snapshot = testSnapshot({
      "src/observability.ts":
        "import pino from 'pino';\nSentry.init({ dsn: process.env.SENTRY_DSN });",
    });
    expect(checkObs001Observability(snapshot, testContext(snapshot))).toEqual(
      [],
    );
  });
});
