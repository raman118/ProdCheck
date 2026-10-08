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
      const tableName = statement.match(/\bon\s+(?:public\.)?([\w-]+)/i)?.[1];
      const publicCatalog =
        /\bfor\s+select\b/i.test(statement) &&
        /^(?:products?|prices?|plans?|tiers?)$/i.test(tableName ?? "");
      const line = content.slice(0, match.index ?? 0).split("\n").length;
      findings.push(
        finding({
          id: `DATA-002:${file}:${line}:${policyName}`,
          checkId: "DATA-002",
          severity: publicCatalog ? "low" : openPolicy ? "critical" : "high",
          category: "data",
          title: publicCatalog
            ? `Public catalog policy ${policyName} allows every row`
            : openPolicy
            ? `RLS policy ${policyName} allows every row`
            : `RLS policy ${policyName} has no user ownership check`,
          explanation: publicCatalog
            ? "This read policy intentionally exposes catalog rows to everyone. Confirm the table contains only information meant to be public."
            : "This policy does not tie access to the signed-in user. Restrict rows with an explicit ownership or role condition before exposing the table.",
          evidence: [
            sourceEvidence(
              snapshot,
              file,
              line,
              `RLS policy ${policyName} has a permissive or missing identity condition.`,
            ),
          ],
          confidence: publicCatalog ? 0.62 : openPolicy ? 0.9 : 0.72,
        }),
      );
    }
  }
  return findings;
};
