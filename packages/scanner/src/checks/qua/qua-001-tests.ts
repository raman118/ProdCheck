import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding } from "../helpers";

const TEST_DIRECTORY = /(?:^|\/)(?:__tests__|tests?|specs?)(?:\/|$)/i;
const TEST_FILE = /(?:^|\/)[^/]+\.(?:test|spec)\.[cm]?[jt]sx?$/i;

export const checkQua001Tests: Check = (snapshot, context): Finding[] => {
  void context;
  if (
    [...snapshot.files.keys()].some(
      (path) => TEST_DIRECTORY.test(path) || TEST_FILE.test(path),
    )
  )
    return [];
  return [
    finding({
      id: "QUA-001:no-tests",
      checkId: "QUA-001",
      severity: "medium",
      category: "quality",
      title: "No test files were detected",
      explanation:
        "Tests catch regressions before deploys. Add focused unit tests for core business rules and one integration test for a critical path.",
      confidence: 0.72,
    }),
  ];
};
