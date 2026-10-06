import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, routeFiles, sourceEvidence } from "../helpers";

const AUTH_GUARD =
  /\b(?:requireAuth|withAuth|authenticate|isAuthenticated|verifyToken|verifyJwt|getUser|getSession|auth\.getUser)\b/i;
const RATE_LIMIT =
  /\b(?:rateLimit|rate-limit|rate_limiter|throttle|upstash|express-rate-limit|arcjet)\b/i;
const PUBLIC_PATH = /(?:auth|login|signup|register|password|webhook|public)/i;

export const checkRel001RateLimit: Check = (snapshot, context): Finding[] => {
  void context;
  const findings: Finding[] = [];
  for (const file of routeFiles(snapshot)) {
    if (/(?:^|\/)(?:health|healthz)(?:\/|$)/i.test(file)) continue;
    const content = snapshot.files.get(file) ?? "";
    const isPublic = PUBLIC_PATH.test(file) || !AUTH_GUARD.test(content);
    if (!isPublic || RATE_LIMIT.test(content)) continue;
    findings.push(
      finding({
        id: `REL-001:${file}`,
        checkId: "REL-001",
        severity: "high",
        category: "reliability",
        title: "Public API route has no visible rate limit",
        explanation:
          "Unauthenticated routes can be called repeatedly. Add a per-IP or per-account limit to reduce brute force and resource abuse.",
        evidence: [
          sourceEvidence(
            snapshot,
            file,
            1,
            `Public API route ${file} has no visible rate limiter.`,
          ),
        ],
        confidence: 0.68,
      }),
    );
  }
  return findings;
};
