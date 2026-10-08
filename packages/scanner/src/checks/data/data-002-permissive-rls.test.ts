import { describe, expect, it } from "vitest";
import { checkData002PermissiveRls } from "./data-002-permissive-rls";
import { testContext, testSnapshot } from "../test-helper";

describe("DATA-002 permissive RLS", () => {
  it("flags unconditional and ownerless policies", () => {
    const snapshot = testSnapshot({
      "supabase/migrations/001.sql": [
        "create policy open_read on public.posts for select using (true);",
        "create policy any_update on public.posts for update using (owner_id is not null);",
      ].join("\n"),
    });
    const findings = checkData002PermissiveRls(snapshot, testContext(snapshot));
    expect(findings).toHaveLength(2);
    expect(findings[0]?.severity).toBe("critical");
  });

  it("accepts an ownership check and ignores service-role policies", () => {
    const snapshot = testSnapshot({
      "supabase/migrations/001.sql": [
        "create policy owner_read on public.posts for select using (owner_id = auth.uid());",
        "create policy service_write on public.posts to service_role using (true);",
      ].join("\n"),
    });
    expect(checkData002PermissiveRls(snapshot, testContext(snapshot))).toEqual(
      [],
    );
  });

  it("treats public read-only catalog policies as low severity review items", () => {
    const snapshot = testSnapshot({
      "supabase/migrations/001.sql": [
        "create policy public_products on public.products for select using (true);",
        "create policy public_prices on public.prices for select using (true);",
      ].join("\n"),
    });
    const findings = checkData002PermissiveRls(snapshot, testContext(snapshot));
    expect(findings.map(({ severity }) => severity)).toEqual(["low", "low"]);
  });
});
