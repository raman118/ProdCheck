import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, sourceEvidence } from "../helpers";

const REQUIRED_HEADERS = [
  {
    key: "csp",
    name: "Content-Security-Policy",
    pattern: /content-security-policy/i,
  },
  {
    key: "hsts",
    name: "Strict-Transport-Security",
    pattern: /strict-transport-security/i,
  },
  {
    key: "frame",
    name: "X-Frame-Options or CSP frame-ancestors",
    pattern: /x-frame-options|frame-ancestors/i,
  },
] as const;
const CONFIG_PATH =
  /(?:next\.config\.|middleware\.|vercel\.json$|netlify\.|nginx\.conf$|firebase\.json$|(?:server|main)\.[cm]?[jt]s$)/i;

export const checkSec005SecurityHeaders: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const configuration = [...snapshot.files.entries()].filter(([path]) =>
    CONFIG_PATH.test(path),
  );
  const configurationText = configuration
    .map(([, content]) => content)
    .join("\n");
  const evidenceFile = configuration[0]?.[0];
  const findings: Finding[] = [];

  for (const header of REQUIRED_HEADERS) {
    if (header.pattern.test(configurationText)) continue;
    findings.push(
      finding({
        id: `SEC-005:${header.key}`,
        checkId: "SEC-005",
        severity: "medium",
        category: "security",
        title: `Missing ${header.name}`,
        explanation: `The repository configuration does not set ${header.name}. Add it at the app or hosting layer to reduce browser-side attack risk.`,
        evidence: evidenceFile
          ? [
              sourceEvidence(
                snapshot,
                evidenceFile,
                1,
                `No ${header.name} setting was found in detected configuration files.`,
              ),
            ]
          : [],
        confidence: evidenceFile ? 0.7 : 0.58,
      }),
    );
  }
  return findings;
};
