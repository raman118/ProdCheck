import { describe, expect, it } from "vitest";
import { publicScanError } from "./public-error";

describe("public scan errors", () => {
  it("maps known failures to safe action-oriented messages", () => {
    expect(
      publicScanError(
        new Error("The repository or branch was not found or is private."),
      ),
    ).toContain("not found or is private");
    expect(
      publicScanError(new Error("Repository scan exceeded its time limit.")),
    ).toContain("time limit");
  });

  it("never returns stack traces, file paths, or arbitrary exception details", () => {
    const publicMessage = publicScanError(
      new Error(
        "Failed reading C:\\private\\secret.ts with key=sk_live_veryprivatevalue",
      ),
    );
    expect(publicMessage).toBe(
      "The repository could not be scanned. Check that it is public and try again.",
    );
    expect(publicMessage).not.toContain("private");
  });
});
