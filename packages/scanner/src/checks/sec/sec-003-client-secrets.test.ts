import { describe, expect, it } from "vitest";
import { checkSec003ClientSecrets } from "./sec-003-client-secrets";
import { testContext, testSnapshot } from "../test-helper";

describe("SEC-003 client secret exposure", () => {
  it("flags public service-role variables and service keys in client components", () => {
    const snapshot = testSnapshot({
      ".env.example": "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=",
      "src/components/admin.tsx":
        '"use client";\nconst key = process.env.SUPABASE_SERVICE_ROLE_KEY;',
    });
    const findings = checkSec003ClientSecrets(snapshot, testContext(snapshot));
    expect(findings).toHaveLength(2);
    expect(findings.every(({ severity }) => severity === "critical")).toBe(
      true,
    );
  });

  it("does not warn on the public Supabase anon key", () => {
    const snapshot = testSnapshot({
      "src/client.ts":
        "export const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;",
    });
    expect(checkSec003ClientSecrets(snapshot, testContext(snapshot))).toEqual(
      [],
    );
  });
});
