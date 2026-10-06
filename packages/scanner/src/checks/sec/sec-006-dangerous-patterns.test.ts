import { describe, expect, it } from "vitest";
import { checkSec006DangerousPatterns } from "./sec-006-dangerous-patterns";
import { testContext, testSnapshot } from "../test-helper";

describe("SEC-006 dangerous patterns", () => {
  it("detects eval, unsanitized HTML, and string-built SQL", () => {
    const snapshot = testSnapshot({
      "src/app.tsx": [
        "eval(input);",
        "<div dangerouslySetInnerHTML={{ __html: userValue }} />;",
        'db.query("SELECT * FROM users WHERE name = " + name);',
      ].join("\n"),
    });
    const findings = checkSec006DangerousPatterns(
      snapshot,
      testContext(snapshot),
    );
    expect(findings.map(({ title }) => title)).toEqual([
      "Dynamic code execution with eval",
      "HTML is inserted without a visible sanitizer",
      "SQL statement is built from string input",
    ]);
  });

  it("recognizes sanitized HTML before insertion", () => {
    const snapshot = testSnapshot({
      "src/app.tsx": [
        "const safeHtml = DOMPurify.sanitize(rawHtml);",
        "<div dangerouslySetInnerHTML={{ __html: safeHtml }} />;",
      ].join("\n"),
    });
    expect(
      checkSec006DangerousPatterns(snapshot, testContext(snapshot)),
    ).toEqual([]);
  });
});
