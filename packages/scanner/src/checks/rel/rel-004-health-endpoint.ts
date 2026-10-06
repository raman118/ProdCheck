import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding } from "../helpers";

const HEALTH_PATH = /(?:^|\/)(?:health|healthz)(?:\/|\.|$)/i;
const HEALTH_ROUTE =
  /(?:\.get|\.route|fetch\s*\()\s*\(\s*["'`]\/(?:api\/)?healthz?(?:["'`/])/i;

export const checkRel004HealthEndpoint: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const exists = [...snapshot.files.entries()].some(
    ([path, content]) => HEALTH_PATH.test(path) || HEALTH_ROUTE.test(content),
  );
  if (exists) return [];
  return [
    finding({
      id: "REL-004:missing-health-endpoint",
      checkId: "REL-004",
      severity: "low",
      category: "reliability",
      title: "No health endpoint was detected",
      explanation:
        "A lightweight health route gives hosting and monitoring systems a safe way to confirm the app is running.",
      confidence: 0.6,
    }),
  ];
};
