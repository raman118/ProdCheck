import { describe, expect, it } from "vitest";
import { checkData001RlsEnabled } from "./data-001-rls-enabled";
import { testContext, testSnapshot } from "../test-helper";

describe("DATA-001 Supabase RLS", () => {
  it("reports tables without an RLS enable statement", () => {
    const snapshot = testSnapshot({
      "supabase/migrations/001.sql":
        "create table public.profiles (id uuid primary key, name text);",
    });
    expect(
      checkData001RlsEnabled(snapshot, testContext(snapshot)),
    ).toHaveLength(1);
  });

  it("accepts an enabled RLS table in a later migration", () => {
    const snapshot = testSnapshot({
      "supabase/migrations/001.sql":
        "create table profiles (id uuid primary key, name text);",
      "supabase/migrations/002.sql":
        "alter table public.profiles enable row level security;",
    });
    expect(checkData001RlsEnabled(snapshot, testContext(snapshot))).toEqual([]);
  });
});
