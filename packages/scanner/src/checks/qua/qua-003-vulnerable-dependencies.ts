import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, sourceEvidence } from "../helpers";

export const checkQua003VulnerableDependencies: Check = (
  snapshot,
  context,
): Finding[] => {
  return context.advisories.map((advisory) => {
    const lockfile = snapshot.dependencies.find(
      (dependency) =>
        dependency.name === advisory.packageName &&
        dependency.version === advisory.version,
    )?.lockfile;
    return finding({
      id: `QUA-003:${advisory.packageName}@${advisory.version}:${advisory.id}`,
      checkId: "QUA-003",
      severity: "high",
      category: "quality",
      title: `Vulnerable dependency ${advisory.packageName}@${advisory.version}`,
      explanation: `${advisory.summary}${advisory.fixedVersion ? ` Upgrade to ${advisory.fixedVersion} or later.` : " Review the OSV advisory and choose a patched version."}`,
      evidence: lockfile
        ? [
            sourceEvidence(
              snapshot,
              lockfile,
              1,
              `OSV reported ${advisory.id} for ${advisory.packageName}@${advisory.version}.`,
            ),
          ]
        : [],
      confidence: context.osvStatus === "online" ? 0.95 : 0.76,
    });
  });
};
