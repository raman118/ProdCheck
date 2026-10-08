import { describe, expect, it } from "vitest";
import { checkQua004PinnedDependencies } from "./qua-004-pinned-dependencies";
import { testContext, testSnapshot } from "../test-helper";

describe("QUA-004 reproducible dependencies", () => {
  it("reports a missing lockfile and ranged dependency versions", () => {
    const snapshot = testSnapshot({
      "package.json": JSON.stringify({
        dependencies: { react: "^19.0.0", lodash: "~4.17.21" },
      }),
    });
    const findings = checkQua004PinnedDependencies(
      snapshot,
      testContext(snapshot),
    );
    expect(findings).toHaveLength(3);
  });

  it("accepts exact pins, workspace protocols, and a lockfile", () => {
    const snapshot = testSnapshot({
      "package.json": JSON.stringify({
        dependencies: { react: "19.0.0", local: "workspace:*" },
      }),
    });
    const withLock = { ...snapshot, lockfiles: new Set(["pnpm-lock.yaml"]) };
    expect(
      checkQua004PinnedDependencies(withLock, testContext(withLock)),
    ).toEqual([]);
  });

  it("accepts ranged dependencies resolved by the committed lockfile", () => {
    const snapshot = testSnapshot({
      "package.json": JSON.stringify({ dependencies: { react: "^19.0.0" } }),
    });
    const withLock = {
      ...snapshot,
      lockfiles: new Set(["pnpm-lock.yaml"]),
      dependencies: [
        { name: "react", version: "19.1.0", lockfile: "pnpm-lock.yaml" },
      ],
    };
    expect(
      checkQua004PinnedDependencies(withLock, testContext(withLock)),
    ).toEqual([]);
  });
});
