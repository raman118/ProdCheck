import { describe, expect, it } from "vitest";
import { FindingSchema } from "./finding";

const validFinding = {
  id: "SEC-001:app/api/route.ts:1",
  checkId: "SEC-001",
  severity: "high",
  category: "security",
  title: "Missing API authentication",
  explanation: "Protect this route.",
  evidence: [
    {
      file: "app/api/route.ts",
      lineStart: 1,
      lineEnd: 1,
      snippet: "export async function GET() {}",
    },
  ],
  confidence: 0.9,
};

describe("FindingSchema", () => {
  it("accepts a complete finding and an optional fix", () => {
    expect(
      FindingSchema.parse({
        ...validFinding,
        fix: {
          description: "Add auth",
          patch: "--- a/file\n+++ b/file",
          validated: true,
        },
      }).checkId,
    ).toBe("SEC-001");
  });

  it("rejects invalid severities, check ids, and confidence", () => {
    expect(
      FindingSchema.safeParse({ ...validFinding, severity: "urgent" }).success,
    ).toBe(false);
    expect(
      FindingSchema.safeParse({ ...validFinding, checkId: "BAD" }).success,
    ).toBe(false);
    expect(
      FindingSchema.safeParse({ ...validFinding, confidence: 2 }).success,
    ).toBe(false);
  });
});
