import { describe, expect, it } from "vitest";
import { parseGitHubRepoUrl } from "./github-url";

describe("parseGitHubRepoUrl", () => {
  it("accepts a public repository URL", () => {
    expect(parseGitHubRepoUrl("https://github.com/acme/shop")).toEqual({
      owner: "acme",
      repo: "shop",
    });
  });

  it("accepts a nested branch name and a .git suffix", () => {
    expect(
      parseGitHubRepoUrl(
        "https://github.com/acme/shop.git/tree/release/2026-q4",
      ),
    ).toEqual({
      owner: "acme",
      repo: "shop",
      branch: "release/2026-q4",
    });
  });

  it.each([
    "http://github.com/acme/shop",
    "https://github.com.evil.test/acme/shop",
    "https://user@github.com/acme/shop",
    "https://github.com/acme/shop?tab=code",
    "https://github.com/acme/shop/issues",
    "https://github.com/acme/shop/tree/../private",
    "https://github.com/acme/shop/tree/%2e%2e/private",
    "https://github.com//acme/shop",
  ])("rejects unsafe or unsupported URL %s", (url) => {
    expect(() => parseGitHubRepoUrl(url)).toThrow();
  });
});
