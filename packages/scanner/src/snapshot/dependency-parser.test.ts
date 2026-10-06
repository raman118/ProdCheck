import { describe, expect, it } from "vitest";
import {
  MAX_LOCKFILE_PARSE_BYTES,
  parseLockfileDependencies,
} from "./dependency-parser";

describe("parseLockfileDependencies", () => {
  it("extracts exact dependency versions from npm lockfiles", () => {
    const lockfile = JSON.stringify({
      packages: {
        "": { name: "sample" },
        "node_modules/react": { version: "19.0.0" },
        "node_modules/@supabase/supabase-js": { version: "2.0.0" },
      },
    });
    expect(parseLockfileDependencies("package-lock.json", lockfile)).toEqual([
      { name: "react", version: "19.0.0", lockfile: "package-lock.json" },
      {
        name: "@supabase/supabase-js",
        version: "2.0.0",
        lockfile: "package-lock.json",
      },
    ]);
  });

  it("extracts package selectors from pnpm and resolved versions from yarn", () => {
    const pnpm = [
      "lockfileVersion: '9.0'",
      "importers:",
      "  .:",
      "packages:",
      "  react@19.0.0:",
      "  '@supabase/supabase-js@2.0.0':",
      "snapshots:",
      "  react@19.0.0:",
    ].join("\n");
    const yarn = [
      "react@^19.0.0:",
      '  version "19.0.0"',
      '"@supabase/supabase-js@^2.0.0":',
      '  version "2.0.0"',
    ].join("\n");
    expect(
      parseLockfileDependencies("pnpm-lock.yaml", pnpm).map(
        ({ name, version }) => `${name}@${version}`,
      ),
    ).toContain("@supabase/supabase-js@2.0.0");
    expect(
      parseLockfileDependencies("yarn.lock", yarn).map(
        ({ name, version }) => `${name}@${version}`,
      ),
    ).toEqual(["react@19.0.0", "@supabase/supabase-js@2.0.0"]);
  });

  it("parses Bun lock data and refuses excessive lockfile text", () => {
    const bun = JSON.stringify({
      packages: { react: ["react@19.0.0", "", "sha512-value"] },
    });
    expect(parseLockfileDependencies("bun.lock", bun)[0]?.version).toBe(
      "19.0.0",
    );
    expect(
      parseLockfileDependencies(
        "yarn.lock",
        "x".repeat(MAX_LOCKFILE_PARSE_BYTES + 1),
      ),
    ).toEqual([]);
  });
});
