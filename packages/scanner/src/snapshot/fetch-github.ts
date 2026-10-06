import { createSnapshotFromTar, gunzipCapped } from "./archive";
import { parseGitHubRepoUrl } from "./github-url";
import {
  DEFAULT_SNAPSHOT_LIMITS,
  type RepoSnapshot,
  type SnapshotLimits,
} from "./types";

const GITHUB_API = "https://api.github.com";
const ALLOWED_HOSTS = new Set([
  "api.github.com",
  "codeload.github.com",
  "github.com",
]);
const MAX_REDIRECTS = 3;
const MAX_API_RESPONSE_BYTES = 1024 * 1024;

export interface FetchSnapshotOptions {
  readonly token?: string;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  readonly limits?: SnapshotLimits;
  readonly fetchImpl?: typeof fetch;
}

interface GitHubRepositoryResponse {
  readonly default_branch?: string;
}

interface GitHubCommitResponse {
  readonly sha?: string;
}

async function readCappedBody(
  response: Response,
  maxBytes: number,
  label: string,
): Promise<Uint8Array> {
  if (!response.body) throw new Error(`GitHub returned an empty ${label}.`);
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > maxBytes) {
    throw new Error(`${label} exceeds the ${maxBytes} byte download limit.`);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error(
          `${label} exceeds the ${maxBytes} byte download limit.`,
        );
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("limit")) throw error;
    throw new Error(`Failed while reading the GitHub ${label}.`);
  }

  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function requestGitHub(
  initialUrl: string,
  headers: HeadersInit,
  signal: AbortSignal,
  fetchImpl: typeof fetch,
): Promise<Response> {
  let url = new URL(initialUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (
      url.protocol !== "https:" ||
      !ALLOWED_HOSTS.has(url.hostname) ||
      url.port !== ""
    ) {
      throw new Error(
        "GitHub returned a redirect outside the approved GitHub hosts.",
      );
    }

    const response = await fetchImpl(url, {
      method: "GET",
      headers,
      redirect: "manual",
      signal,
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location || redirects === MAX_REDIRECTS) {
      throw new Error(
        "GitHub returned an invalid or excessive archive redirect.",
      );
    }
    const redirectUrl = new URL(location, url);
    if (redirectUrl.hostname !== url.hostname)
      headers = { Accept: "application/vnd.github+json" };
    url = redirectUrl;
  }
  throw new Error("GitHub returned too many archive redirects.");
}

async function readJson<T>(
  url: string,
  headers: HeadersInit,
  signal: AbortSignal,
  fetchImpl: typeof fetch,
): Promise<T> {
  const response = await requestGitHub(url, headers, signal, fetchImpl);
  if (!response.ok) {
    if (response.status === 404)
      throw new Error("The repository or branch was not found or is private.");
    if (response.status === 403 || response.status === 429) {
      throw new Error(
        "GitHub rate limit reached. Try again later or configure GITHUB_TOKEN.",
      );
    }
    throw new Error(
      `GitHub API request failed with status ${response.status}.`,
    );
  }
  const bytes = await readCappedBody(
    response,
    MAX_API_RESPONSE_BYTES,
    "API response",
  );
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    throw new Error("GitHub returned an invalid API response.");
  }
}

export async function fetchGitHubSnapshot(
  input: string,
  options: FetchSnapshotOptions = {},
): Promise<RepoSnapshot> {
  const repository = parseGitHubRepoUrl(input);
  const limits = options.limits ?? DEFAULT_SNAPSHOT_LIMITS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 45_000,
  );
  const signal = options.signal
    ? AbortSignal.any([controller.signal, options.signal])
    : controller.signal;
  const apiHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ProdCheck/0.1",
  };
  if (options.token) apiHeaders.Authorization = `Bearer ${options.token}`;

  try {
    const encodedOwner = encodeURIComponent(repository.owner);
    const encodedRepo = encodeURIComponent(repository.repo);
    const repoUrl = `${GITHUB_API}/repos/${encodedOwner}/${encodedRepo}`;
    const metadata = await readJson<GitHubRepositoryResponse>(
      repoUrl,
      apiHeaders,
      signal,
      fetchImpl,
    );
    const ref = repository.branch ?? metadata.default_branch;
    if (!ref)
      throw new Error(
        "GitHub did not report a default branch for this repository.",
      );

    const commitUrl = `${repoUrl}/commits/${encodeURIComponent(ref)}`;
    const commit = await readJson<GitHubCommitResponse>(
      commitUrl,
      apiHeaders,
      signal,
      fetchImpl,
    );
    if (!commit.sha || !/^[a-f0-9]{40}$/i.test(commit.sha)) {
      throw new Error("GitHub returned an invalid commit identifier.");
    }

    const archiveUrl = `${repoUrl}/tarball/${commit.sha}`;
    const archiveResponse = await requestGitHub(
      archiveUrl,
      { ...apiHeaders, Accept: "application/vnd.github+json" },
      signal,
      fetchImpl,
    );
    if (!archiveResponse.ok) {
      if (archiveResponse.status === 404)
        throw new Error("GitHub could not create an archive for this commit.");
      throw new Error(
        `GitHub archive request failed with status ${archiveResponse.status}.`,
      );
    }

    const compressed = await readCappedBody(
      archiveResponse,
      limits.maxArchiveBytes,
      "repository archive",
    );
    const tarBytes = await gunzipCapped(compressed, limits.maxExpandedBytes);
    return createSnapshotFromTar(
      tarBytes,
      {
        owner: repository.owner,
        repo: repository.repo,
        commitSha: commit.sha,
      },
      limits,
    );
  } catch (error) {
    if (options.signal?.aborted)
      throw new Error("Repository scan was canceled.");
    if (controller.signal.aborted)
      throw new Error("Repository scan exceeded its time limit.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
