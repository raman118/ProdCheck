import { describe, expect, it } from "vitest";
import { checkRel002BodyValidation } from "./rel-002-body-validation";
import { testContext, testSnapshot } from "../test-helper";

describe("REL-002 request validation", () => {
  it("reports an unvalidated request body", () => {
    const snapshot = testSnapshot({
      "app/api/profile/route.ts":
        "export async function POST(request: Request) { const body = await request.json(); return Response.json(body); }",
    });
    expect(
      checkRel002BodyValidation(snapshot, testContext(snapshot)),
    ).toHaveLength(1);
  });

  it("accepts a visible schema parse", () => {
    const snapshot = testSnapshot({
      "app/api/profile/route.ts":
        "const bodySchema = z.object({ name: z.string() }); export async function POST(request: Request) { const body = bodySchema.parse(await request.json()); }",
    });
    expect(checkRel002BodyValidation(snapshot, testContext(snapshot))).toEqual(
      [],
    );
  });
});
