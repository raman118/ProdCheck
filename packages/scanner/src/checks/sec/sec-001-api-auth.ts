import type { Finding } from "@prodcheck/shared/finding";
import type { Check } from "../contracts";
import {
  finding,
  isExportedVariable,
  routeFiles,
  snapshotPath,
  sourceEvidence,
  sourceFiles,
} from "../helpers";

const HTTP_METHODS = new Set([
  "DELETE",
  "GET",
  "HEAD",
  "OPTIONS",
  "PATCH",
  "POST",
  "PUT",
]);
const AUTH_GUARD =
  /\b(?:requireAuth|withAuth|authenticate|isAuthenticated|verifyToken|verifyJwt|getUser|getSession|auth\.getUser|authorization)\b/i;

export const checkSec001ApiAuth: Check = (snapshot, context): Finding[] => {
  void context;
  const routes = new Set(routeFiles(snapshot));
  const findings: Finding[] = [];
  const files = sourceFiles(snapshot, (path) => routes.has(path));

  for (const sourceFile of files) {
    const path = snapshotPath(snapshot, sourceFile.getFilePath());
    if (/(?:^|\/)(?:health|healthz)(?:\/|$)/i.test(path)) continue;
    const exportedMethods = sourceFile
      .getFunctions()
      .filter((fn) => fn.isExported() && HTTP_METHODS.has(fn.getName() ?? ""));
    const exportedMethodVariables = sourceFile
      .getVariableDeclarations()
      .filter(
        (declaration) =>
          isExportedVariable(declaration) &&
          HTTP_METHODS.has(declaration.getName()),
      );
    const pageHandler =
      /(?:^|\/)pages\/api\//i.test(path) &&
      sourceFile.getExportAssignments().length > 0;
    const handler = exportedMethods[0] ?? exportedMethodVariables[0];
    if (!handler && !pageHandler) continue;
    if (AUTH_GUARD.test(sourceFile.getFullText())) continue;

    const lineStart =
      handler?.getStartLineNumber() ??
      sourceFile.getExportAssignments()[0]?.getStartLineNumber() ??
      1;
    const adminRoute = /(?:^|\/)admin(?:\/|$)/i.test(path);
    findings.push(
      finding({
        id: `SEC-001:${path}:${lineStart}`,
        checkId: "SEC-001",
        severity: adminRoute ? "critical" : "high",
        category: "security",
        title: adminRoute
          ? "Admin API handler has no visible auth guard"
          : "API handler has no visible auth guard",
        explanation:
          "This public handler has no recognizable authentication check. Verify the caller before returning data or changing state.",
        evidence: [
          sourceEvidence(
            snapshot,
            path,
            lineStart,
            `Exported API handler at ${path}:${lineStart}. No auth guard was found in this file.`,
          ),
        ],
        confidence: 0.78,
      }),
    );
  }
  return findings;
};
