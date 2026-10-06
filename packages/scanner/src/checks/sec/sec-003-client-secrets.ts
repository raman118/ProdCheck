import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, sourceEvidence } from "../helpers";

const PUBLIC_SECRET_NAME =
  /\bNEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE_KEY|ACCESS_TOKEN|JWT)(?:_|\b)/i;
const SERVICE_SECRET_REFERENCE =
  /\b(?:SUPABASE_SERVICE_ROLE_KEY|service_role|(?:secret|private)[_-]?key)\b/i;

function isClientFile(path: string, content: string): boolean {
  return (
    /(?:^|\/)(?:client|public)(?:\/|$)/i.test(path) ||
    /^\s*["']use client["']/m.test(content)
  );
}

export const checkSec003ClientSecrets: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const findings: Finding[] = [];
  for (const [file, content] of snapshot.files) {
    const clientFile = isClientFile(file, content);
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const publicSecret = PUBLIC_SECRET_NAME.test(line);
      if (!publicSecret && !(clientFile && SERVICE_SECRET_REFERENCE.test(line)))
        continue;
      const lineNumber = index + 1;
      findings.push(
        finding({
          id: `SEC-003:${file}:${lineNumber}`,
          checkId: "SEC-003",
          severity: "critical",
          category: "security",
          title: "Server secret is exposed to client code",
          explanation:
            "Service-role and private credentials must stay on the server. Remove the public prefix or client reference and rotate the credential if it was deployed.",
          evidence: [
            sourceEvidence(
              snapshot,
              file,
              lineNumber,
              "Secret key name is referenced in client-visible code; values are omitted.",
            ),
          ],
          confidence: publicSecret ? 0.94 : 0.82,
        }),
      );
    }
  }
  return findings;
};
