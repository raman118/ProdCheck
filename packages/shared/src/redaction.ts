import { ScanReportSchema, type ScanReport } from "./score";

const KNOWN_SECRET =
  /(?:sk_live_[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sb_secret_[A-Za-z0-9_-]{16,}|AKIA[A-Z0-9]{16})/g;
const SECRET_ASSIGNMENT =
  /\b([A-Za-z0-9_-]*(?:secret|token|password|api[_-]?key|private[_-]?key)[A-Za-z0-9_-]*\s*[:=]\s*)(["'`]?)([A-Za-z0-9+/_=-]{16,})\2/gi;

export function redactSecretText(
  input: string,
  secrets: readonly string[] = [],
): string {
  let result = input;
  for (const secret of [...secrets]
    .filter((value) => value.length >= 8)
    .sort((a, b) => b.length - a.length)) {
    result = result.split(secret).join(`${secret.slice(0, 4)}…[redacted]`);
  }
  result = result.replace(
    KNOWN_SECRET,
    (secret) => `${secret.slice(0, 4)}…[redacted]`,
  );
  return result.replace(
    SECRET_ASSIGNMENT,
    (_match, prefix: string, quote: string, value: string) =>
      `${prefix}${quote}${value.slice(0, 4)}…[redacted]${quote}`,
  );
}

export function redactScanReport(
  report: ScanReport,
  secrets: readonly string[] = [],
): ScanReport {
  return ScanReportSchema.parse({
    ...report,
    findings: report.findings.map((finding) => {
      const evidence = finding.evidence.map((item) => ({
        ...item,
        snippet: redactSecretText(item.snippet, secrets),
      }));
      const fixPatch = finding.fix
        ? redactSecretText(finding.fix.patch, secrets)
        : undefined;
      const fix =
        finding.fix && fixPatch === finding.fix.patch
          ? {
              ...finding.fix,
              description: redactSecretText(finding.fix.description, secrets),
            }
          : undefined;
      return {
        ...finding,
        title: redactSecretText(finding.title, secrets),
        explanation: redactSecretText(finding.explanation, secrets),
        evidence,
        ...(fix ? { fix } : { fix: undefined }),
      };
    }),
  });
}
