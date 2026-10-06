import {
  DEFAULT_SNAPSHOT_LIMITS,
  type RepoSnapshot,
  type SnapshotLimits,
} from "./types";
import {
  MAX_LOCKFILE_PARSE_BYTES,
  parseLockfileDependencies,
} from "./dependency-parser";

const BLOCK_BYTES = 512;
const SKIPPED_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
]);
const BINARY_EXTENSIONS =
  /\.(?:7z|avif|bmp|class|dll|dylib|exe|gif|ico|jar|jpeg|jpg|lockb|mp3|mp4|o|otf|pdf|png|so|ttf|wasm|webp|woff2?|zip)$/i;
const LOCKFILE_NAMES = new Set([
  "bun.lock",
  "bun.lockb",
  "npm-shrinkwrap.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

interface TarEntry {
  readonly path: string;
  readonly data: Uint8Array;
  readonly type: string;
}

function decode(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function readString(bytes: Uint8Array): string {
  const end = bytes.indexOf(0);
  return decode(end < 0 ? bytes : bytes.subarray(0, end));
}

function readOctal(bytes: Uint8Array, label: string): number {
  const value = readString(bytes).trim();
  if (value === "") return 0;
  if (!/^[0-7]+$/.test(value))
    throw new Error(`Archive has an invalid ${label} field.`);
  const parsed = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(parsed))
    throw new Error(`Archive ${label} exceeds the supported size.`);
  return parsed;
}

function readPaxPath(bytes: Uint8Array): string | undefined {
  let offset = 0;
  while (offset < bytes.length) {
    let space = offset;
    while (space < bytes.length && bytes[space] !== 32) space += 1;
    if (space === bytes.length)
      throw new Error("Archive contains malformed PAX metadata.");
    const lengthText = decode(bytes.subarray(offset, space));
    const length = Number.parseInt(lengthText, 10);
    if (
      !/^[0-9]+$/.test(lengthText) ||
      !Number.isInteger(length) ||
      length <= space - offset + 1 ||
      offset + length > bytes.length
    ) {
      throw new Error("Archive contains malformed PAX metadata.");
    }
    const record = decode(bytes.subarray(space + 1, offset + length - 1));
    if (record.startsWith("path=")) return record.slice(5);
    offset += length;
  }
  return undefined;
}

function parseTar(bytes: Uint8Array, limits: SnapshotLimits): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;
  let nextLongName: string | undefined;
  let nextPaxPath: string | undefined;
  let globalPaxPath: string | undefined;

  while (offset + BLOCK_BYTES <= bytes.byteLength) {
    const header = bytes.subarray(offset, offset + BLOCK_BYTES);
    offset += BLOCK_BYTES;
    if (header.every((byte) => byte === 0)) break;

    const recordedChecksum = readOctal(
      header.subarray(148, 156),
      "header checksum",
    );
    let calculatedChecksum = 0;
    for (let index = 0; index < BLOCK_BYTES; index += 1) {
      calculatedChecksum +=
        index >= 148 && index < 156 ? 32 : (header[index] ?? 0);
    }
    if (recordedChecksum !== calculatedChecksum)
      throw new Error("Archive contains a corrupt tar header.");

    const name = readString(header.subarray(0, 100));
    const prefix = readString(header.subarray(345, 500));
    const headerPath = prefix ? `${prefix}/${name}` : name;
    const size = readOctal(header.subarray(124, 136), "file size");
    const typeByte = header[156] ?? 0;
    const type = typeByte === 0 ? "0" : String.fromCharCode(typeByte);
    if (size > limits.maxExpandedBytes || offset + size > bytes.byteLength) {
      throw new Error(
        "Archive contains a truncated file or a file over the expanded size limit.",
      );
    }
    const data = bytes.subarray(offset, offset + size);
    const paddedSize = Math.ceil(size / BLOCK_BYTES) * BLOCK_BYTES;
    if (offset + paddedSize > bytes.byteLength)
      throw new Error("Archive ends inside a file entry.");
    offset += paddedSize;

    if (type === "L") {
      nextLongName = readString(data);
      continue;
    }
    if (type === "x" || type === "g") {
      const paxPath = readPaxPath(data);
      if (type === "g") globalPaxPath = paxPath ?? globalPaxPath;
      else nextPaxPath = paxPath;
      continue;
    }

    const path = nextPaxPath ?? globalPaxPath ?? nextLongName ?? headerPath;
    nextPaxPath = undefined;
    nextLongName = undefined;
    if (
      !path ||
      path.includes("\\") ||
      path.startsWith("/") ||
      /^[A-Za-z]:/.test(path)
    ) {
      throw new Error(
        "Archive contains an unsafe absolute or platform-specific path.",
      );
    }
    const pathParts = path.split("/").filter(Boolean);
    if (
      pathParts.some(
        (part) => part === "." || part === ".." || hasControlCharacters(part),
      )
    ) {
      throw new Error("Archive contains a path traversal entry.");
    }
    if (type !== "0" && type !== "7") continue;
    if (path.endsWith("/")) continue;
    if (entries.length >= limits.maxFiles)
      throw new Error(`Archive exceeds the ${limits.maxFiles} file limit.`);

    entries.push({ path: pathParts.join("/"), data, type });
  }
  return entries;
}

function isSkippedPath(path: string): boolean {
  return path
    .split("/")
    .some((segment) => SKIPPED_DIRS.has(segment.toLowerCase()));
}

function isTextFile(path: string, data: Uint8Array): boolean {
  return (
    !BINARY_EXTENSIONS.test(path) &&
    !data.subarray(0, Math.min(data.length, 8_192)).includes(0)
  );
}

export function createSnapshotFromTar(
  tarBytes: Uint8Array,
  repository: { owner: string; repo: string; commitSha: string },
  limits: SnapshotLimits = DEFAULT_SNAPSHOT_LIMITS,
): RepoSnapshot {
  if (tarBytes.byteLength > limits.maxExpandedBytes) {
    throw new Error(
      `Expanded archive exceeds the ${limits.maxExpandedBytes} byte limit.`,
    );
  }
  const entries = parseTar(tarBytes, limits);
  const firstPath = entries[0]?.path;
  const rootName = firstPath?.includes("/")
    ? firstPath.split("/")[0]
    : undefined;
  if (
    rootName &&
    entries.some((entry) => !entry.path.startsWith(`${rootName}/`))
  ) {
    throw new Error(
      "Archive mixes files from different top-level directories.",
    );
  }
  const files = new Map<string, string>();
  const lockfiles = new Set<string>();
  const dependencies = new Map<string, RepoSnapshot["dependencies"][number]>();
  let totalBytes = 0;

  for (const entry of entries) {
    const normalizedPath =
      rootName && entry.path.startsWith(`${rootName}/`)
        ? entry.path.slice(rootName.length + 1)
        : entry.path;
    if (
      !normalizedPath ||
      normalizedPath === rootName ||
      isSkippedPath(normalizedPath)
    )
      continue;
    const basename = normalizedPath.split("/").at(-1)?.toLowerCase();
    if (basename && LOCKFILE_NAMES.has(basename)) {
      lockfiles.add(normalizedPath);
      if (
        isTextFile(normalizedPath, entry.data) &&
        entry.data.byteLength <= MAX_LOCKFILE_PARSE_BYTES
      ) {
        for (const dependency of parseLockfileDependencies(
          normalizedPath,
          decode(entry.data),
        )) {
          dependencies.set(
            `${dependency.name}@${dependency.version}`,
            dependency,
          );
        }
      }
      continue;
    }
    if (!isTextFile(normalizedPath, entry.data)) continue;
    const content = decode(entry.data);
    files.set(normalizedPath, content);
    totalBytes += entry.data.byteLength;
  }

  return {
    ...repository,
    files,
    lockfiles,
    dependencies: [...dependencies.values()],
    totalBytes,
  };
}

export async function gunzipCapped(
  compressed: Uint8Array,
  maxExpandedBytes = DEFAULT_SNAPSHOT_LIMITS.maxExpandedBytes,
): Promise<Uint8Array> {
  if (compressed.byteLength === 0)
    throw new Error("GitHub returned an empty archive.");
  const compressedBuffer = compressed.buffer.slice(
    compressed.byteOffset,
    compressed.byteOffset + compressed.byteLength,
  ) as ArrayBuffer;
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = new Blob([compressedBuffer])
      .stream()
      .pipeThrough(new DecompressionStream("gzip"))
      .getReader();
  } catch {
    throw new Error("GitHub returned an invalid gzip archive.");
  }
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxExpandedBytes) {
        await reader.cancel();
        throw new Error(
          `Expanded archive exceeds the ${maxExpandedBytes} byte limit.`,
        );
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("limit")) throw error;
    throw new Error("GitHub returned an invalid gzip archive.");
  }
  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export function snapshotLimits(
  overrides: Partial<SnapshotLimits> = {},
): SnapshotLimits {
  return { ...DEFAULT_SNAPSHOT_LIMITS, ...overrides };
}
