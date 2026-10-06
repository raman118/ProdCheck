import { describe, expect, it } from "vitest";
import { checkQua003VulnerableDependencies } from "./qua-003-vulnerable-dependencies";
import { testContext, testSnapshot } from "../test-helper";

describe("QUA-003 vulnerable dependencies", () => {
  it("turns online and offline fixture advisories into findings", () => {
    const snapshot = testSnapshot({ "package-lock.json": "{}" });
    const advisory = {
      packageName: "lodash",
      version: "4.17.20",
      id: "GHSA-fixture",
      summary: "A known issue affects this version.",
      fixedVersion: "4.17.21",
    };
    const online = {
      ...testContext(snapshot),
      advisories: [advisory],
      osvStatus: "online" as const,
    };
    const offline = {
      ...testContext(snapshot),
      advisories: [advisory],
      osvStatus: "offline" as const,
    };
    expect(
      checkQua003VulnerableDependencies(snapshot, online)[0]?.confidence,
    ).toBe(0.95);
    expect(
      checkQua003VulnerableDependencies(snapshot, offline)[0]?.confidence,
    ).toBe(0.76);
  });

  it("returns no finding when OSV and its fallback report no advisories", () => {
    const snapshot = testSnapshot({ "package-lock.json": "{}" });
    expect(
      checkQua003VulnerableDependencies(snapshot, testContext(snapshot)),
    ).toEqual([]);
  });
});
