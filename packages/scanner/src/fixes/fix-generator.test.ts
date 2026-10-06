import { describe, expect, it } from "vitest";
import type { Finding } from "@prodcheck/shared/finding";
import type { RepoSnapshot } from "../snapshot/types";
import { attachValidatedFixes } from "./fix-generator";
import { validatePatch } from "./patch-validator";

const baseSnapshot = (files: Record<string, string>): RepoSnapshot => ({
  owner: "test",
  repo: "repo",
  commitSha: "a".repeat(40),
  files: new Map(Object.entries(files)),
  lockfiles: new Set(),
  dependencies: [],
  totalBytes: 0,
});

const finding = (checkId: Finding["checkId"], id = checkId): Finding => ({
  id,
  checkId,
  severity: "medium",
  category: "reliability",
  title: "Add health check",
  explanation: "Test finding",
  evidence: [],
  confidence: 0.9,
});

describe("verified fix generation", () => {
  it("creates and validates a Next.js health endpoint without executing it", () => {
    const snapshot = baseSnapshot({
      "app/page.tsx": "export default function Page() { return null; }\n",
    });
    const [result] = attachValidatedFixes(snapshot, [finding("REL-004")]);
    expect(result?.fix?.validated).toBe(true);
    expect(result?.fix?.patch).toContain("app/api/health/route.ts");
    expect(snapshot.files.has("app/api/health/route.ts")).toBe(false);
  });

  it("restricts wildcard CORS using an environment-configured origin", () => {
    const path = "app/api/data/route.ts";
    const snapshot = baseSnapshot({
      [path]: 'export const headers = { origin: "*" };\n',
    });
    const item = {
      ...finding("SEC-004", "cors"),
      evidence: [
        { file: path, lineStart: 1, lineEnd: 1, snippet: 'origin: "*"' },
      ],
    };
    const [result] = attachValidatedFixes(snapshot, [item]);
    expect(result?.fix?.validated).toBe(true);
    expect(result?.fix?.patch).toContain("process.env.APP_ORIGIN");
  });

  it("adds RLS only when a clear owner column exists", () => {
    const migration = "supabase/migrations/001_profiles.sql";
    const source =
      "create table public.profiles (id uuid primary key, user_id uuid, name text);\n";
    const snapshot = baseSnapshot({
      "supabase/config.toml": 'project_id = "demo"\n',
      [migration]: source,
    });
    const item = {
      ...finding("DATA-001", "DATA-001:public.profiles"),
      title: "Supabase table public.profiles has RLS disabled",
    };
    const [result] = attachValidatedFixes(snapshot, [item]);
    expect(result?.fix?.validated).toBe(true);
    expect(result?.fix?.patch).toContain("auth.uid() = user_id");
    const ambiguous = baseSnapshot({
      "supabase/config.toml": "",
      "supabase/migrations/001.sql":
        "create table public.events (id uuid primary key);",
    });
    expect(
      attachValidatedFixes(ambiguous, [
        { ...item, title: "Supabase table public.events has RLS disabled" },
      ])[0]?.fix,
    ).toBeUndefined();
  });

  it("rejects traversal, non-applying, network, and syntactically invalid patches", () => {
    const path = "app/api/health/route.ts";
    const files = new Map<string, string>([[path, "export const page = 1;\n"]]);
    expect(
      validatePatch(
        "--- a/../../secret\n+++ b/../../secret\n@@ -1 +1 @@\n-a\n+b\n",
        files,
      ).valid,
    ).toBe(false);
    expect(
      validatePatch(
        `--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-missing\n+value\n`,
        files,
      ).valid,
    ).toBe(false);
    expect(
      validatePatch(
        `--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-export const page = 1;\n+fetch('/x');\n`,
        files,
      ).valid,
    ).toBe(false);
    expect(
      validatePatch(
        `--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-export const page = 1;\n+export const = ;\n`,
        files,
      ).valid,
    ).toBe(false);
  });
});
