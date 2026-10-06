import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, jsTsFile, sourceEvidence } from "../helpers";

const EXTERNAL_CALL =
  /\b(?:fetch|axios\.(?:get|post|put|patch|delete)|supabase\.(?:from|auth))\s*\(/i;
const HAS_TIMEOUT =
  /(?:AbortSignal\.timeout|timeout(?:Ms)?\s*[:=]|signal\s*:\s*AbortSignal)/i;
const HAS_ERROR_HANDLING = /\btry\s*\{|\.catch\s*\(/i;

export const checkRel003ExternalCalls: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const findings: Finding[] = [];
  for (const [file, content] of snapshot.files) {
    if (!jsTsFile(file)) continue;
    const lines = content.split(/\r?\n/);
    const callIndex = lines.findIndex((line) => EXTERNAL_CALL.test(line));
    if (callIndex < 0) continue;
    const lacksTimeout = !HAS_TIMEOUT.test(content);
    const lacksErrorHandling = !HAS_ERROR_HANDLING.test(content);
    if (!lacksTimeout && !lacksErrorHandling) continue;
    const missing = [
      lacksTimeout ? "a timeout" : "",
      lacksErrorHandling ? "error handling" : "",
    ]
      .filter(Boolean)
      .join(" and ");
    findings.push(
      finding({
        id: `REL-003:${file}:${callIndex + 1}`,
        checkId: "REL-003",
        severity: "medium",
        category: "reliability",
        title: "External call lacks a timeout or error handling",
        explanation: `This external call is missing ${missing}. Bound how long it can wait and handle failures so the request can recover cleanly.`,
        evidence: [sourceEvidence(snapshot, file, callIndex + 1)],
        confidence: 0.64,
      }),
    );
  }
  return findings;
};
