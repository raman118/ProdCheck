import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, countLineMatches, sourceEvidence } from "../helpers";

const WILDCARD_CORS =
  /(?:access-control-allow-origin\s*[:=]\s*["']?\*|set\s*\(\s*["']access-control-allow-origin["']\s*,\s*["']\*["']|\borigin\s*:\s*["']\*["'])/i;

export const checkSec004WildcardCors: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const findings: Finding[] = [];
  for (const [file, content] of snapshot.files) {
    for (const lineNumber of countLineMatches(content, WILDCARD_CORS)) {
      findings.push(
        finding({
          id: `SEC-004:${file}:${lineNumber}`,
          checkId: "SEC-004",
          severity: "medium",
          category: "security",
          title: "CORS accepts every origin",
          explanation:
            "A wildcard origin lets any website call this browser-facing API. Restrict access to the origins that need it.",
          evidence: [sourceEvidence(snapshot, file, lineNumber)],
          confidence: 0.84,
        }),
      );
    }
  }
  return findings;
};
