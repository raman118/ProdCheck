import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, routeFiles, sourceEvidence } from "../helpers";

const REQUEST_BODY =
  /(?:request|req)\.(?:json|text|formData)\s*\(|\breq\.body\b/i;
const VALIDATOR =
  /\b(?:safeParse|\.parse\s*\(|validate(?:Request|Body)?\s*\(|zod|joi|valibot|yup)\b/i;

export const checkRel002BodyValidation: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const findings: Finding[] = [];
  for (const file of routeFiles(snapshot)) {
    const content = snapshot.files.get(file) ?? "";
    const bodyLine = content
      .split(/\r?\n/)
      .findIndex((line) => REQUEST_BODY.test(line));
    if (bodyLine < 0 || VALIDATOR.test(content)) continue;
    findings.push(
      finding({
        id: `REL-002:${file}:${bodyLine + 1}`,
        checkId: "REL-002",
        severity: "medium",
        category: "reliability",
        title: "Request body has no visible schema validation",
        explanation:
          "Malformed or unexpected input can reach application logic. Validate the request against a Zod, Joi, Valibot, or equivalent schema before using it.",
        evidence: [sourceEvidence(snapshot, file, bodyLine + 1)],
        confidence: 0.72,
      }),
    );
  }
  return findings;
};
