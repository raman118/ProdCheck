import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding } from "../helpers";

const STRUCTURED_LOGGING =
  /\b(?:pino|winston|bunyan|loglevel|logger\.(?:info|warn|error|debug)|log\.(?:info|warn|error))\b/i;
const ERROR_TRACKING =
  /(?:@sentry\/|Sentry\.(?:init|captureException)|captureException\s*\(|Bugsnag|bugsnag|Rollbar|rollbar|Datadog\.init)/i;

export const checkObs001Observability: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const contents = [...snapshot.files.values()].join("\n");
  const findings: Finding[] = [];
  if (!STRUCTURED_LOGGING.test(contents)) {
    findings.push(
      finding({
        id: "OBS-001:structured-logging",
        checkId: "OBS-001",
        severity: "medium",
        category: "observability",
        title: "No structured logging was detected",
        explanation:
          "Structured logs make production failures easier to search and correlate. Add a logger that records event names and useful request context.",
        confidence: 0.56,
      }),
    );
  }
  if (!ERROR_TRACKING.test(contents)) {
    findings.push(
      finding({
        id: "OBS-001:error-tracking",
        checkId: "OBS-001",
        severity: "medium",
        category: "observability",
        title: "No error tracking service was detected",
        explanation:
          "Without error tracking, production exceptions can go unnoticed. Add a server-side error reporting integration or document the platform integration.",
        confidence: 0.56,
      }),
    );
  }
  return findings;
};
