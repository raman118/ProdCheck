import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, sourceEvidence } from "../helpers";

const KNOWN_SECRET =
  /(?:sk_live_[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sb_secret_[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})/;
const SECRET_ASSIGNMENT =
  /\b([A-Za-z0-9_-]*(?:secret|token|password|api[_-]?key|private[_-]?key)[A-Za-z0-9_-]*)\s*[:=]\s*(["'`])([^"'`\s]{16,})\2/i;
const PLACEHOLDER =
  /^(?:your[_-]|example|changeme|change_me|placeholder|process\.env|\$\{)/i;

function entropy(value: string): number {
  const counts = new Map<string, number>();
  for (const character of value)
    counts.set(character, (counts.get(character) ?? 0) + 1);
  let bits = 0;
  for (const count of counts.values()) {
    const probability = count / value.length;
    bits -= probability * Math.log2(probability);
  }
  return bits;
}

function maskLine(line: string, value: string): string {
  return line.replace(value, `${value.slice(0, 4)}…[redacted]`).slice(0, 300);
}

export function collectSecretValues(
  snapshot: import("../../snapshot/types").RepoSnapshot,
): string[] {
  const values = new Set<string>();
  for (const content of snapshot.files.values()) {
    for (const line of content.split(/\r?\n/)) {
      const knownMatch = line.match(KNOWN_SECRET)?.[0];
      const assignment = line.match(SECRET_ASSIGNMENT);
      const candidate = knownMatch ?? assignment?.[3];
      if (
        candidate &&
        (knownMatch ||
          (!PLACEHOLDER.test(candidate) && entropy(candidate) >= 4.2))
      )
        values.add(candidate);
    }
  }
  return [...values];
}

export const checkSec002Secrets: Check = (snapshot, context): Finding[] => {
  void context;
  const findings: Finding[] = [];

  for (const [file, content] of snapshot.files) {
    const basename = file.split("/").at(-1)?.toLowerCase() ?? "";
    const isEnvFile =
      /^\.env(?:\..+)?$/.test(basename) &&
      !/\.(?:example|sample|template|defaults?)$/.test(basename);
    if (isEnvFile) {
      findings.push(
        finding({
          id: `SEC-002:${file}:env-file`,
          checkId: "SEC-002",
          severity: "high",
          category: "security",
          title: "Environment file is committed",
          explanation:
            "Committed environment files can expose production credentials. Remove the file from version control and rotate any real credentials it contains.",
          evidence: [
            sourceEvidence(
              snapshot,
              file,
              1,
              "Committed environment file detected; values are hidden.",
            ),
          ],
          confidence: 0.82,
        }),
      );
    }

    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const knownMatch = line.match(KNOWN_SECRET)?.[0];
      const assignment = line.match(SECRET_ASSIGNMENT);
      const candidate = knownMatch ?? assignment?.[3];
      if (
        !candidate ||
        (!knownMatch &&
          (PLACEHOLDER.test(candidate) || entropy(candidate) < 4.2))
      )
        continue;

      const lineNumber = index + 1;
      const keyName = assignment?.[1] ?? "credential";
      findings.push(
        finding({
          id: `SEC-002:${file}:${lineNumber}:secret`,
          checkId: "SEC-002",
          severity: knownMatch ? "critical" : "high",
          category: "security",
          title: "Possible hardcoded secret",
          explanation: `A value assigned to ${keyName} looks like a credential. Move it to server-side environment configuration and rotate it if it is real.`,
          evidence: [
            sourceEvidence(
              snapshot,
              file,
              lineNumber,
              maskLine(line, candidate),
            ),
          ],
          confidence: knownMatch ? 0.96 : 0.7,
        }),
      );
    }
  }
  return findings;
};
