const SAFE_MESSAGES: readonly [RegExp, string][] = [
  [
    /only public https|valid public github|use https:\/\/github\.com/i,
    "Enter a public GitHub repository URL, with an optional /tree/branch.",
  ],
  [
    /repository or branch was not found or is private/i,
    "The repository or branch was not found or is private.",
  ],
  [
    /github rate limit/i,
    "GitHub's rate limit was reached. Try again later or configure GITHUB_TOKEN.",
  ],
  [
    /scan exceeded its time limit|exceeded.*time limit/i,
    "The scan reached its time limit. Try a smaller repository.",
  ],
  [
    /size limit|file limit|expanded byte limit/i,
    "This repository exceeds ProdCheck's scan limits.",
  ],
];

export function publicScanError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  return (
    SAFE_MESSAGES.find(([pattern]) => pattern.test(message))?.[1] ??
    "The repository could not be scanned. Check that it is public and try again."
  );
}
