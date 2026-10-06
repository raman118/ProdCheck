import { describe, expect, it } from "vitest";
import { checkSec005SecurityHeaders } from "./sec-005-security-headers";
import { testContext, testSnapshot } from "../test-helper";

describe("SEC-005 security headers", () => {
  it("reports each missing header and recognizes configured headers", () => {
    const snapshot = testSnapshot({
      "next.config.ts":
        'const headers = [{ key: "Content-Security-Policy", value: "default-src self" }];',
    });
    const findings = checkSec005SecurityHeaders(
      snapshot,
      testContext(snapshot),
    );
    expect(findings.map(({ title }) => title)).toEqual([
      "Missing Strict-Transport-Security",
      "Missing X-Frame-Options or CSP frame-ancestors",
    ]);
  });

  it("returns no findings when all required protections exist", () => {
    const snapshot = testSnapshot({
      "next.config.ts":
        "Content-Security-Policy Strict-Transport-Security X-Frame-Options",
    });
    expect(checkSec005SecurityHeaders(snapshot, testContext(snapshot))).toEqual(
      [],
    );
  });
});
