import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import { finding, sourceEvidence } from "../helpers";

const EXACT_VERSION =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const LOCAL_PROTOCOL = /^(?:workspace:|file:|link:|portal:|catalog:)/;

function isPinned(version: string): boolean {
  if (LOCAL_PROTOCOL.test(version)) return true;
  if (version.startsWith("npm:")) {
    const separator = version.lastIndexOf("@");
    return separator > 3 && EXACT_VERSION.test(version.slice(separator + 1));
  }
  return EXACT_VERSION.test(version);
}

export const checkQua004PinnedDependencies: Check = (
  snapshot,
  context,
): Finding[] => {
  void context;
  const findings: Finding[] = [];
  if (snapshot.lockfiles.size === 0) {
    findings.push(
      finding({
        id: "QUA-004:no-lockfile",
        checkId: "QUA-004",
        severity: "medium",
        category: "quality",
        title: "No dependency lockfile was detected",
        explanation:
          "A committed lockfile makes production installs reproducible. Generate one with the repository's package manager and commit it.",
        confidence: 0.9,
      }),
    );
  }

  for (const [file, content] of snapshot.files) {
    if (file.split("/").at(-1) !== "package.json") continue;
    let manifest: unknown;
    try {
      manifest = JSON.parse(content);
    } catch {
      continue;
    }
    if (
      typeof manifest !== "object" ||
      manifest === null ||
      Array.isArray(manifest)
    )
      continue;
    const fields = manifest as Record<string, unknown>;
    for (const groupName of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ]) {
      const group = fields[groupName];
      if (typeof group !== "object" || group === null || Array.isArray(group))
        continue;
      for (const [name, version] of Object.entries(group)) {
        if (typeof version !== "string" || isPinned(version)) continue;
        const line = content
          .split(/\r?\n/)
          .findIndex((value) => value.includes(`"${name}"`));
        const lineNumber = Math.max(1, line + 1);
        findings.push(
          finding({
            id: `QUA-004:${file}:${name}`,
            checkId: "QUA-004",
            severity: "medium",
            category: "quality",
            title: `Dependency ${name} is not pinned to an exact version`,
            explanation: `The manifest uses ${version}, which may resolve to different releases. Pin an exact version and update the lockfile through the package manager.`,
            evidence: [sourceEvidence(snapshot, file, lineNumber)],
            confidence: 0.84,
          }),
        );
      }
    }
  }
  return findings;
};
