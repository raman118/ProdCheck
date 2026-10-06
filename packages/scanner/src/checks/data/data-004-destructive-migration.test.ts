import { describe, expect, it } from "vitest";
import { checkData004DestructiveMigration } from "./data-004-destructive-migration";
import { testContext, testSnapshot } from "../test-helper";

describe("DATA-004 destructive migrations", () => {
  it("finds drops, unbounded deletes, and not-null changes without defaults", () => {
    const snapshot = testSnapshot({
      "supabase/migrations/001.sql": [
        "drop table public.old_events;",
        "delete from public.users;",
        "alter table public.users add column tenant_id uuid not null;",
      ].join("\n"),
    });
    const findings = checkData004DestructiveMigration(
      snapshot,
      testContext(snapshot),
    );
    expect(findings).toHaveLength(3);
    expect(findings.some(({ severity }) => severity === "critical")).toBe(true);
  });

  it("allows bounded delete and a not-null column with a default", () => {
    const snapshot = testSnapshot({
      "supabase/migrations/001.sql": [
        "delete from public.users where inactive = true;",
        "alter table public.users add column active boolean not null default true;",
      ].join("\n"),
    });
    expect(
      checkData004DestructiveMigration(snapshot, testContext(snapshot)),
    ).toEqual([]);
  });
});
