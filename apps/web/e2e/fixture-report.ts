import { resolve } from "node:path";
import {
  ALL_CHECKS,
  attachValidatedFixes,
  calculateScore,
  createScanReport,
  detectStack,
  lookupOsvAdvisories,
} from "@prodcheck/scanner";
import { loadFixtureSnapshot } from "../../../scripts/fixtures/load-fixture";

export async function loadMissingAuthReport() {
  const snapshot = await loadFixtureSnapshot(
    "missing-auth",
    resolve(process.cwd(), "..", ".."),
  );
  const stack = detectStack(snapshot);
  const osv = await lookupOsvAdvisories(snapshot.dependencies, {
    fetchImpl: (async () => {
      throw new Error("Playwright fixture scan never uses the network.");
    }) as typeof fetch,
  });
  const context = {
    stack,
    advisories: osv.advisories,
    osvStatus: osv.status,
  };
  const findings = ALL_CHECKS.flatMap((check) => check(snapshot, context));
  const fixedFindings = attachValidatedFixes(snapshot, findings);
  return createScanReport(
    snapshot,
    stack,
    calculateScore(fixedFindings),
    osv.status,
    "2026-10-06T00:00:00.000Z",
  );
}
