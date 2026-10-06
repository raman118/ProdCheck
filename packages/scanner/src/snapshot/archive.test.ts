import { describe, expect, it } from "vitest";
import { createSnapshotFromTar, gunzipCapped } from "./archive";
import type { SnapshotLimits } from "./types";

function writeOctal(
  header: Uint8Array,
  start: number,
  length: number,
  value: number,
): void {
  const octal = value.toString(8).padStart(length - 1, "0");
  for (let index = 0; index < octal.length; index += 1)
    header[start + index] = octal.charCodeAt(index);
  header[start + length - 1] = 0;
}

function tarFile(path: string, content: string): Uint8Array {
  const data = new TextEncoder().encode(content);
  const header = new Uint8Array(512);
  const pathBytes = new TextEncoder().encode(path);
  header.set(pathBytes.subarray(0, 100), 0);
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, data.byteLength);
  writeOctal(header, 136, 12, 0);
  header.fill(32, 148, 156);
  header[156] = "0".charCodeAt(0);
  header.set(new TextEncoder().encode("ustar\0"), 257);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  const checksumText = checksum.toString(8).padStart(6, "0");
  header.set(new TextEncoder().encode(`${checksumText}\0 `), 148);
  const paddedData = new Uint8Array(Math.ceil(data.byteLength / 512) * 512);
  paddedData.set(data);
  return new Uint8Array([...header, ...paddedData, ...new Uint8Array(1024)]);
}

function tarFiles(
  entries: ReadonlyArray<readonly [string, string]>,
): Uint8Array {
  const chunks = entries.flatMap(([path, content]) =>
    Array.from(tarFile(path, content).slice(0, -1024)),
  );
  return new Uint8Array([...chunks, ...new Uint8Array(1024)]);
}

describe("createSnapshotFromTar", () => {
  const repository = { owner: "acme", repo: "shop", commitSha: "a".repeat(40) };

  it("strips the archive root and skips generated, binary, and lockfile contents", () => {
    const tarBytes = tarFiles([
      ["shop-main/package.json", '{"dependencies":{"next":"15"}}'],
      ["shop-main/node_modules/pkg/index.js", "ignored"],
      ["shop-main/public/logo.png", "binary"],
      ["shop-main/pnpm-lock.yaml", "lockfile contents"],
    ]);
    const snapshot = createSnapshotFromTar(tarBytes, repository);
    expect(snapshot.files.get("package.json")).toBe(
      '{"dependencies":{"next":"15"}}',
    );
    expect(snapshot.files.has("node_modules/pkg/index.js")).toBe(false);
    expect(snapshot.files.has("public/logo.png")).toBe(false);
    expect(snapshot.files.has("pnpm-lock.yaml")).toBe(false);
    expect(snapshot.lockfiles.has("pnpm-lock.yaml")).toBe(true);
  });

  it("rejects path traversal, mixed archive roots, and file count overflow", () => {
    expect(() =>
      createSnapshotFromTar(tarFile("shop-main/../secret", "x"), repository),
    ).toThrow(/traversal/);
    const mixedRoots = tarFiles([
      ["shop-main/one.ts", "one"],
      ["other-main/two.ts", "two"],
    ]);
    expect(() => createSnapshotFromTar(mixedRoots, repository)).toThrow(
      /top-level/,
    );

    const limits: SnapshotLimits = {
      maxArchiveBytes: 1024,
      maxExpandedBytes: 10_000,
      maxFiles: 1,
    };
    const twoFiles = tarFiles([
      ["shop-main/one.ts", "one"],
      ["shop-main/two.ts", "two"],
    ]);
    expect(() => createSnapshotFromTar(twoFiles, repository, limits)).toThrow(
      /1 file limit/,
    );
  });

  it("retains lockfile paths and parsed versions without storing lockfile text", () => {
    const lockfile = JSON.stringify({
      packages: { "node_modules/react": { version: "19.0.0" } },
    });
    const snapshot = createSnapshotFromTar(
      tarFile("shop-main/package-lock.json", lockfile),
      repository,
    );
    expect(snapshot.lockfiles.has("package-lock.json")).toBe(true);
    expect(snapshot.files.has("package-lock.json")).toBe(false);
    expect(snapshot.dependencies).toEqual([
      { name: "react", version: "19.0.0", lockfile: "package-lock.json" },
    ]);
  });

  it("rejects archives over the expanded byte limit", () => {
    expect(() =>
      createSnapshotFromTar(new Uint8Array(20), repository, {
        maxArchiveBytes: 10,
        maxExpandedBytes: 10,
        maxFiles: 5,
      }),
    ).toThrow(/Expanded archive/);
  });
});

describe("gunzipCapped", () => {
  it("enforces the expanded archive cap while decompressing", async () => {
    const stream = new Blob([new TextEncoder().encode("x".repeat(2048))])
      .stream()
      .pipeThrough(new CompressionStream("gzip"));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    await expect(gunzipCapped(compressed, 1024)).rejects.toThrow(
      /Expanded archive/,
    );
  });
});
