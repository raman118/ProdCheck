import { describe, expect, it } from "vitest";
import { detectStack } from "./stack-detector";
import type { RepoSnapshot } from "../snapshot/types";

function snapshot(
  files: Record<string, string>,
  lockfiles: string[] = [],
): RepoSnapshot {
  return {
    owner: "acme",
    repo: "shop",
    commitSha: "a".repeat(40),
    files: new Map(Object.entries(files)),
    lockfiles: new Set(lockfiles),
    dependencies: [],
    totalBytes: 0,
  };
}

describe("detectStack", () => {
  it("detects Next.js, React, Supabase, and package manager without executing files", () => {
    const result = detectStack(
      snapshot(
        {
          "package.json": JSON.stringify({
            dependencies: {
              next: "15.1.0",
              react: "19.0.0",
              "@supabase/supabase-js": "2.0.0",
            },
          }),
          "supabase/config.toml": "project_id = 'sample'",
        },
        ["pnpm-lock.yaml"],
      ),
    );
    expect(result).toEqual({
      node: true,
      frameworks: ["nextjs", "react"],
      supabase: true,
      packageManager: "pnpm",
      packageCount: 3,
      malformedPackageJson: false,
    });
  });

  it("handles repositories without a Node manifest", () => {
    expect(detectStack(snapshot({ README: "no app" }))).toEqual({
      node: false,
      frameworks: [],
      supabase: false,
      packageManager: "unknown",
      packageCount: 0,
      malformedPackageJson: false,
    });
  });

  it("detects dependencies in nested workspace package manifests", () => {
    const result = detectStack(
      snapshot({
        "apps/store/package.json": JSON.stringify({
          dependencies: { next: "15", react: "19" },
        }),
        "apps/store/next.config.mts": "export default {}",
      }),
    );
    expect(result.node).toBe(true);
    expect(result.frameworks).toEqual(["nextjs", "react"]);
  });

  it("marks malformed package metadata while detecting Supabase migrations", () => {
    const result = detectStack(
      snapshot({
        "package.json": "{invalid",
        "supabase/migrations/001_init.sql": "create table demo(id int);",
      }),
    );
    expect(result.malformedPackageJson).toBe(true);
    expect(result.supabase).toBe(true);
  });
});
