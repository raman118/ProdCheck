import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, sourceEvidence } from "../helpers";
import { migrationFiles } from "./sql-schema";

const POLICY = /create\s+policy\s+(?:"([^"]+)"|([\w-]+))([\s\S]*?)(?:;|$)/gi;

export const checkData002PermissiveRls: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const findings: Finding[] = [];
  for (const [file, content] of migrationFiles(snapshot)) {
    for (const match of content.matchAll(POLICY)) {
      const statement = match[0];
      const policyName = match[1] ?? match[2] ?? "unnamed";
      const openPolicy =
        /\busing\s*\(\s*true\s*\)|\bwith\s+check\s*\(\s*true\s*\)/i.test(
          statement,
        );
      const lacksUserIdentity = !/auth\.uid\s*\(\s*\)/i.test(statement);
      const servicePolicy =
        /\bservice_role\b/i.test(statement) &&
        !/\b(?:anon|authenticated)\b/i.test(statement);
      if ((!openPolicy && !lacksUserIdentity) || servicePolicy) continue;
      const line = content.slice(0, match.index ?? 0).split("\n").length;
      findings.push(
        finding({
          id: `DATA-002:${file}:${line}:${policyName}`,
          checkId: "DATA-002",
          severity: openPolicy ? "critical" : "high",
          category: "data",
          title: openPolicy
            ? `RLS policy ${policyName} allows every row`
            : `RLS policy ${policyName} has no user ownership check`,
          explanation:
            "This policy does not tie access to the signed-in user. Restrict rows with an explicit ownership or role condition before exposing the table.",
          evidence: [
            sourceEvidence(
              snapshot,
              file,
              line,
              `RLS policy ${policyName} has a permissive or missing identity condition.`,
            ),
          ],
          confidence: openPolicy ? 0.9 : 0.72,
        }),
      );
    }
  }
  return findings;
};
