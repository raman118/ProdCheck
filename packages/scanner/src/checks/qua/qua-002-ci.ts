import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding } from "../helpers";

const CI_CONFIG =
  /(?:^|\/)(?:\.github\/workflows\/[^/]+\.ya?ml|\.circleci\/config\.ya?ml|\.gitlab-ci\.ya?ml|azure-pipelines\.ya?ml|bitbucket-pipelines\.ya?ml|Jenkinsfile)$/i;

export const checkQua002Ci: Check = (snapshot, context): Finding[] => {
  void context;
  if ([...snapshot.files.keys()].some((path) => CI_CONFIG.test(path)))
    return [];
  return [
    finding({
      id: "QUA-002:no-ci",
      checkId: "QUA-002",
      severity: "medium",
      category: "quality",
      title: "No CI configuration was detected",
      explanation:
        "Automated checks help catch broken builds and tests before they reach production. Add a CI workflow that runs typecheck, lint, tests, and build.",
      confidence: 0.76,
    }),
  ];
};
