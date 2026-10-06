import { describe, expect, it } from "vitest";
import { SCANNER_PIPELINE } from "../packages/scanner/src/index";

describe("scanner pipeline scaffold baseline", () => {
  it("keeps the planned analysis stages ordered", () => {
    expect(SCANNER_PIPELINE).toMatchInlineSnapshot(`
      [
        "snapshot",
        "stack",
        "checks",
        "score",
        "report",
      ]
    `);
  });
});
