import { describe, expect, it } from "vitest";
import { checkQua002Ci } from "./qua-002-ci";
import { testContext, testSnapshot } from "../test-helper";

describe("QUA-002 CI presence", () => {
  it("reports when no CI config is present", () => {
    const snapshot = testSnapshot({ "src/app.ts": "export const app = {};" });
    expect(checkQua002Ci(snapshot, testContext(snapshot))).toHaveLength(1);
  });

  it("recognizes GitHub Actions and GitLab CI", () => {
    const github = testSnapshot({ ".github/workflows/ci.yml": "name: CI" });
    const gitlab = testSnapshot({ ".gitlab-ci.yml": "test: {}" });
    expect(checkQua002Ci(github, testContext(github))).toEqual([]);
    expect(checkQua002Ci(gitlab, testContext(gitlab))).toEqual([]);
  });
});
