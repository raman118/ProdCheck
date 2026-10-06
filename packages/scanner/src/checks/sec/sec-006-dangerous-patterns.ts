import type { Finding } from "@prodcheck/shared/finding";
import { SyntaxKind } from "ts-morph";
import type { Check } from "../contracts";
import {
  finding,
  jsTsFile,
  snapshotPath,
  sourceEvidence,
  sourceFiles,
} from "../helpers";

const SANITIZER_CALL =
  /\b(?:DOMPurify\.sanitize|sanitizeHtml|sanitize|escapeHtml)\s*\(/i;
const SQL_CONSTRUCTION =
  /\b(?:query|execute|raw)\s*\([^\n]*(?:select|insert|update|delete)[^\n]*(?:\$\{|\s\+\s)/i;

export const checkSec006DangerousPatterns: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const findings: Finding[] = [];
  const parsed = sourceFiles(
    snapshot,
    (path, content) =>
      jsTsFile(path) &&
      /\beval\s*\(|new\s+Function\s*\(|dangerouslySetInnerHTML|\b(?:query|execute|raw)\s*\(/i.test(
        content,
      ),
  );

  for (const sourceFile of parsed) {
    const file = snapshotPath(snapshot, sourceFile.getFilePath());
    const safeVariables = new Set(
      sourceFile
        .getVariableDeclarations()
        .filter((declaration) =>
          SANITIZER_CALL.test(declaration.getInitializer()?.getText() ?? ""),
        )
        .map((declaration) => declaration.getName()),
    );
    for (const call of sourceFile.getDescendantsOfKind(
      SyntaxKind.CallExpression,
    )) {
      const expression = call.getExpression().getText();
      if (expression === "eval" || expression === "window.eval") {
        const line = call.getStartLineNumber();
        findings.push(
          finding({
            id: `SEC-006:${file}:${line}:eval`,
            checkId: "SEC-006",
            severity: "high",
            category: "security",
            title: "Dynamic code execution with eval",
            explanation:
              "`eval` executes text as code and can turn untrusted input into an arbitrary code path. Replace it with explicit parsing or a fixed function map.",
            evidence: [
              sourceEvidence(
                snapshot,
                file,
                line,
                "Dynamic code execution call detected.",
              ),
            ],
          }),
        );
      }
      if (expression === "Function" || expression === "window.Function") {
        const line = call.getStartLineNumber();
        findings.push(
          finding({
            id: `SEC-006:${file}:${line}:function`,
            checkId: "SEC-006",
            severity: "high",
            category: "security",
            title: "Dynamic function construction",
            explanation:
              "Constructing functions from strings evaluates code at runtime. Use a fixed function implementation instead.",
            evidence: [
              sourceEvidence(
                snapshot,
                file,
                line,
                "Dynamic function constructor detected.",
              ),
            ],
          }),
        );
      }
    }

    for (const expression of sourceFile.getDescendantsOfKind(
      SyntaxKind.NewExpression,
    )) {
      if (expression.getExpression().getText() !== "Function") continue;
      const line = expression.getStartLineNumber();
      findings.push(
        finding({
          id: `SEC-006:${file}:${line}:function`,
          checkId: "SEC-006",
          severity: "high",
          category: "security",
          title: "Dynamic function construction",
          explanation:
            "Constructing functions from strings evaluates code at runtime. Use a fixed function implementation instead.",
          evidence: [
            sourceEvidence(
              snapshot,
              file,
              line,
              "Dynamic function constructor detected.",
            ),
          ],
        }),
      );
    }

    for (const attribute of sourceFile.getDescendantsOfKind(
      SyntaxKind.JsxAttribute,
    )) {
      if (attribute.getNameNode().getText() !== "dangerouslySetInnerHTML")
        continue;
      const initializer = attribute.getInitializer()?.getText() ?? "";
      const referencesSanitizedValue = [...safeVariables].some((name) =>
        new RegExp(`\\b${name}\\b`).test(initializer),
      );
      if (SANITIZER_CALL.test(initializer) || referencesSanitizedValue)
        continue;
      const line = attribute.getStartLineNumber();
      findings.push(
        finding({
          id: `SEC-006:${file}:${line}:html`,
          checkId: "SEC-006",
          severity: "high",
          category: "security",
          title: "HTML is inserted without a visible sanitizer",
          explanation:
            "This HTML insertion can run attacker-controlled markup. Sanitize the HTML with a reviewed sanitizer before rendering it.",
          evidence: [
            sourceEvidence(
              snapshot,
              file,
              line,
              "dangerouslySetInnerHTML is used without a recognized sanitizer.",
            ),
          ],
          confidence: 0.73,
        }),
      );
    }

    const content = snapshot.files.get(file) ?? "";
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      if (!SQL_CONSTRUCTION.test(line)) continue;
      const lineNumber = index + 1;
      findings.push(
        finding({
          id: `SEC-006:${file}:${lineNumber}:sql`,
          checkId: "SEC-006",
          severity: "high",
          category: "security",
          title: "SQL statement is built from string input",
          explanation:
            "Concatenating values into SQL can allow query injection. Use parameterized queries or a query builder.",
          evidence: [
            sourceEvidence(
              snapshot,
              file,
              lineNumber,
              "Dynamic SQL construction detected.",
            ),
          ],
          confidence: 0.67,
        }),
      );
    }
  }
  return findings;
};
