import { describe, expect, it } from "vitest";
import { checkQua001Tests } from "./qua-001-tests";
import { testContext, testSnapshot } from "../test-helper";

describe("QUA-001 test coverage presence", () => {
  it("reports when no test files exist", () => {
    const snapshot = testSnapshot({ "src/app.ts": "export const app = {};" });
    expect(checkQua001Tests(snapshot, testContext(snapshot))).toHaveLength(1);
  });

  it("recognizes co-located tests and test directories", () => {
    const snapshot = testSnapshot({
      "src/app.ts": "export const app = {};",
      "src/app.test.ts": "test('app', () => {});",
    });
    expect(checkQua001Tests(snapshot, testContext(snapshot))).toEqual([]);
  });

  it("recognizes files under a conventional test directory", () => {
    const snapshot = testSnapshot({ "test/middleware.basic.js": "assert(true);" });
    expect(checkQua001Tests(snapshot, testContext(snapshot))).toEqual([]);
  });
});
