import { describe, expect, it } from "vitest";
import { checkRel003ExternalCalls } from "./rel-003-external-calls";
import { testContext, testSnapshot } from "../test-helper";

describe("REL-003 external calls", () => {
  it("reports missing timeout and error handling", () => {
    const snapshot = testSnapshot({
      "src/api.ts": "const response = await fetch(url);",
    });
    expect(
      checkRel003ExternalCalls(snapshot, testContext(snapshot)),
    ).toHaveLength(1);
  });

  it("accepts an external call with timeout and error handling", () => {
    const snapshot = testSnapshot({
      "src/api.ts":
        "try { await fetch(url, { signal: AbortSignal.timeout(5000) }); } catch (error) { logger.error(error); }",
    });
    expect(checkRel003ExternalCalls(snapshot, testContext(snapshot))).toEqual(
      [],
    );
  });
});
