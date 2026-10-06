import { describe, expect, it } from "vitest";
import { isBadgeIdentifier, renderScoreBadge } from "./badge";

describe("score badge", () => {
  it("renders a standalone accessible SVG with the score band color", () => {
    expect(renderScoreBadge(96)).toContain(
      'aria-label="ProdCheck score 96/100"',
    );
    expect(renderScoreBadge(96)).toContain("#2c9b5e");
    expect(renderScoreBadge()).toContain("not scanned");
  });

  it("accepts only one safe GitHub path segment", () => {
    expect(isBadgeIdentifier("next.js_repo-1")).toBe(true);
    expect(isBadgeIdentifier("../private")).toBe(false);
    expect(isBadgeIdentifier("%2e%2e")).toBe(false);
  });
});
