import { describe, expect, it } from "vitest";
import { checkSec002Secrets } from "./sec-002-secrets";
import { testContext, testSnapshot } from "../test-helper";

describe("SEC-002 secret detection", () => {
  it("finds committed env files and known key formats while redacting values", () => {
    const fakeKey = ["sk", "live", "0123456789abcdefghijklmn"].join("_");
    const snapshot = testSnapshot({
      ".env.production": `STRIPE_SECRET=${fakeKey}`,
      ".env.example": "STRIPE_SECRET=replace_me",
    });
    const findings = checkSec002Secrets(snapshot, testContext(snapshot));
    expect(
      findings.some(({ title }) => title === "Environment file is committed"),
    ).toBe(true);
    expect(findings.some(({ severity }) => severity === "critical")).toBe(true);
    expect(JSON.stringify(findings)).not.toContain(fakeKey);
    expect(
      findings.some(({ evidence }) =>
        evidence[0]?.snippet.includes("sk_l…[redacted]"),
      ),
    ).toBe(true);
  });

  it("finds high entropy secret assignments but ignores placeholders", () => {
    const snapshot = testSnapshot({
      "src/config.ts": [
        'const API_SECRET = "xK8Vb2Qm7Nw4Jp9Rt3Lh5ZcA";',
        'const API_KEY = "your_api_key_goes_here";',
      ].join("\n"),
    });
    const findings = checkSec002Secrets(snapshot, testContext(snapshot));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("high");
    expect(findings[0]?.evidence[0]?.snippet).not.toContain(
      "xK8Vb2Qm7Nw4Jp9Rt3Lh5ZcA",
    );
  });
});
