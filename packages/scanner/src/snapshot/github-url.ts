import type { GitHubRepoUrl } from "./types";

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const REPO_PATTERN = /^[A-Za-z0-9._-]+$/;

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export function parseGitHubRepoUrl(input: string): GitHubRepoUrl {
  const trimmedInput = input.trim();
  if (trimmedInput.length > 2_048)
    throw new Error("The GitHub repository URL is too long.");
  const rawPath = trimmedInput.match(
    /^https:\/\/github\.com(?::443)?\/([^?#]*)/i,
  )?.[1];
  if (rawPath) {
    if (rawPath.startsWith("/") || rawPath.includes("//"))
      throw new Error("Repository URLs cannot contain empty path segments.");
    try {
      const decodedSegments = rawPath
        .split("/")
        .map((segment) => decodeURIComponent(segment));
      if (
        decodedSegments.some(
          (segment) =>
            segment === "." || segment === ".." || segment.includes("\\"),
        )
      ) {
        throw new Error(
          "Repository URLs cannot contain path traversal segments.",
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("traversal"))
        throw error;
      throw new Error("The repository URL contains invalid URL encoding.");
    }
  }

  let url: URL;
  try {
    url = new URL(trimmedInput);
  } catch {
    throw new Error("Enter a valid public GitHub repository URL.");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error(
      "Only public https://github.com repository URLs are accepted.",
    );
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2 || parts[0] === "tree" || parts[0] === "login") {
    throw new Error(
      "Use https://github.com/{owner}/{repo} with an optional /tree/{branch}.",
    );
  }

  const [owner, rawRepo, ...rest] = parts;
  const repo = rawRepo?.replace(/\.git$/i, "");
  if (
    !owner ||
    !repo ||
    !OWNER_PATTERN.test(owner) ||
    !REPO_PATTERN.test(repo) ||
    repo === "." ||
    repo === ".."
  ) {
    throw new Error("The GitHub owner or repository name is invalid.");
  }

  if (rest.length === 0) return { owner, repo };
  if (rest[0] !== "tree" || rest.length < 2) {
    throw new Error(
      "Use https://github.com/{owner}/{repo} with an optional /tree/{branch}.",
    );
  }

  let branchParts: string[];
  try {
    branchParts = rest.slice(1).map((part) => decodeURIComponent(part));
  } catch {
    throw new Error("The branch name contains invalid URL encoding.");
  }
  if (
    branchParts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        hasControlCharacters(part) ||
        part.includes("\\"),
    ) ||
    branchParts.join("/").length > 1_024
  ) {
    throw new Error("The branch name is invalid.");
  }
  return { owner, repo, branch: branchParts.join("/") };
}
