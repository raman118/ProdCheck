import { describe, expect, it } from "vitest";
import { fetchGitHubSnapshot } from "./fetch-github";

const commitSha = "a".repeat(40);

function tarball(path: string, content: string): Uint8Array {
  const header = new Uint8Array(512);
  const pathBytes = new TextEncoder().encode(path);
  const data = new TextEncoder().encode(content);
  header.set(pathBytes.subarray(0, 100));
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, data.length);
  writeOctal(header, 136, 12, 0);
  header.fill(32, 148, 156);
  header[156] = 48;
  header.set(new TextEncoder().encode("ustar\0"), 257);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.set(
    new TextEncoder().encode(`${checksum.toString(8).padStart(6, "0")}\0 `),
    148,
  );
  const padded = new Uint8Array(Math.ceil(data.length / 512) * 512);
  padded.set(data);
  return new Uint8Array([...header, ...padded, ...new Uint8Array(1024)]);
}

function writeOctal(
  header: Uint8Array,
  start: number,
  length: number,
  value: number,
): void {
  const text = value.toString(8).padStart(length - 1, "0");
  header.set(new TextEncoder().encode(text), start);
  header[start + length - 1] = 0;
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const source = new Blob([buffer])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(source).arrayBuffer());
}

function responseFromBytes(bytes: Uint8Array): Response {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new Response(buffer);
}

describe("fetchGitHubSnapshot", () => {
  it("resolves the default branch and immutable SHA, then follows only GitHub archive redirects", async () => {
    const archive = await gzip(
      tarball("shop-main/package.json", '{"dependencies":{"next":"15"}}'),
    );
    const requests: Array<{ url: string; headers: Headers }> = [];
    const fetchMock = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString());
      requests.push({
        url: url.toString(),
        headers: new Headers(init?.headers),
      });
      if (
        url.hostname === "api.github.com" &&
        url.pathname === "/repos/acme/shop"
      ) {
        return Response.json({ default_branch: "main" });
      }
      if (
        url.hostname === "api.github.com" &&
        url.pathname.endsWith("/commits/main")
      ) {
        return Response.json({ sha: commitSha });
      }
      if (
        url.hostname === "api.github.com" &&
        url.pathname.endsWith(`/tarball/${commitSha}`)
      ) {
        return new Response(null, {
          status: 302,
          headers: {
            location: "https://codeload.github.com/acme/shop/archive.tar.gz",
          },
        });
      }
      if (url.hostname === "codeload.github.com")
        return responseFromBytes(archive);
      throw new Error(`Unexpected request to ${url.hostname}${url.pathname}`);
    }) as typeof fetch;

    const snapshot = await fetchGitHubSnapshot("https://github.com/acme/shop", {
      token: "test-token",
      fetchImpl: fetchMock,
    });
    expect(snapshot.commitSha).toBe(commitSha);
    expect(snapshot.files.get("package.json")).toContain("next");
    expect(requests.map((request) => new URL(request.url).hostname)).toEqual([
      "api.github.com",
      "api.github.com",
      "api.github.com",
      "codeload.github.com",
    ]);
    expect(requests[3]?.headers.has("authorization")).toBe(false);
  });

  it("rejects a redirect to an unapproved host before requesting it", async () => {
    const fetchMock = (async (input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname === "/repos/acme/shop")
        return Response.json({ default_branch: "main" });
      if (url.pathname.endsWith("/commits/main"))
        return Response.json({ sha: commitSha });
      return new Response(null, {
        status: 302,
        headers: { location: "https://attacker.example/archive.tar.gz" },
      });
    }) as typeof fetch;
    await expect(
      fetchGitHubSnapshot("https://github.com/acme/shop", {
        fetchImpl: fetchMock,
      }),
    ).rejects.toThrow(/approved GitHub hosts/);
  });

  it("enforces the compressed archive cap", async () => {
    const fetchMock = (async (input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname === "/repos/acme/shop")
        return Response.json({ default_branch: "main" });
      if (url.pathname.endsWith("/commits/main"))
        return Response.json({ sha: commitSha });
      return responseFromBytes(new Uint8Array(128));
    }) as typeof fetch;
    await expect(
      fetchGitHubSnapshot("https://github.com/acme/shop", {
        fetchImpl: fetchMock,
        limits: { maxArchiveBytes: 64, maxExpandedBytes: 1024, maxFiles: 5 },
      }),
    ).rejects.toThrow(/download limit/);
  });

  it("cancels the current GitHub request when the caller disconnects", async () => {
    const controller = new AbortController();
    const fetchMock = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
        controller.abort();
      })) as typeof fetch;
    await expect(
      fetchGitHubSnapshot("https://github.com/acme/shop", {
        fetchImpl: fetchMock,
        signal: controller.signal,
      }),
    ).rejects.toThrow("Repository scan was canceled.");
  });
});
