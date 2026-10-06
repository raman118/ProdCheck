import { describe, expect, it } from "vitest";
import { checkData003MissingIndex } from "./data-003-missing-index";
import { testContext, testSnapshot } from "../test-helper";

describe("DATA-003 query indexes", () => {
  it("reports a Supabase filter on an unindexed schema column", () => {
    const snapshot = testSnapshot({
      "supabase/migrations/001.sql":
        "create table public.users (id uuid primary key, email text);",
      "src/users.ts": 'supabase.from("users").select("*").eq("email", email);',
    });
    expect(
      checkData003MissingIndex(snapshot, testContext(snapshot)),
    ).toHaveLength(1);
  });

  it("accepts indexed query columns and does not guess unknown schemas", () => {
    const snapshot = testSnapshot({
      "supabase/migrations/001.sql": [
        "create table public.users (id uuid primary key, email text);",
        "create index users_email_idx on public.users (email);",
      ].join("\n"),
      "src/users.ts": 'supabase.from("users").select("*").eq("email", email);',
    });
    expect(checkData003MissingIndex(snapshot, testContext(snapshot))).toEqual(
      [],
    );
  });

  it("checks both sides of a SQL join against their schema indexes", () => {
    const snapshot = testSnapshot({
      "supabase/migrations/001.sql": [
        "create table public.users (id uuid primary key);",
        "create table public.posts (id uuid primary key, user_id uuid);",
      ].join("\n"),
      "src/report.ts":
        "select * from users join posts on posts.user_id = users.id;",
    });
    const findings = checkData003MissingIndex(snapshot, testContext(snapshot));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toContain("posts.user_id");
  });
});
