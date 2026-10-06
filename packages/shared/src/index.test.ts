import { describe, expect, it } from "vitest";
import { PRODUCT_NAME } from "./index";

describe("shared package scaffold", () => {
  it("uses the product name consistently", () => {
    expect(PRODUCT_NAME).toBe("ProdCheck");
  });
});
