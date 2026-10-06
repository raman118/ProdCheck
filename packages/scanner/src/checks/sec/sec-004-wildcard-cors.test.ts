import { describe, expect, it } from "vitest";
import { checkSec004WildcardCors } from "./sec-004-wildcard-cors";
import { testContext, testSnapshot } from "../test-helper";

describe("SEC-004 wildcard CORS", () => {
  it("finds wildcard response headers and cors options", () => {
    const snapshot = testSnapshot({
      "src/cors.ts": [
        'headers.set("Access-Control-Allow-Origin", "*");',
        'cors({ origin: "*" });',
      ].join("\n"),
    });
    expect(
      checkSec004WildcardCors(snapshot, testContext(snapshot)),
    ).toHaveLength(2);
  });

  it("allows an explicit origin", () => {
    const snapshot = testSnapshot({
      "src/cors.ts": 'cors({ origin: "https://app.example.com" });',
    });
    expect(checkSec004WildcardCors(snapshot, testContext(snapshot))).toEqual(
      [],
    );
  });
});
