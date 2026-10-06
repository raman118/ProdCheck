import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ALL_CHECKS,
  attachValidatedFixes,
  calculateScore,
  createScanReport,
  detectStack,
  lookupOsvAdvisories,
} from "../packages/scanner/src/index";
import { loadFixtureSnapshot } from "./fixtures/load-fixture";

const fixtureName = process.argv[2] ?? "missing-auth";
const outputPath =
  process.argv[3] ?? "apps/web/src/data/demo-report.json";
const snapshot = await loadFixtureSnapshot(fixtureName);
const stack = detectStack(snapshot);
const osv = await lookupOsvAdvisories(snapshot.dependencies, {
  fetchImpl: (async () => {
    throw new Error("The seeded demo report does not use the network.");
  }) as typeof fetch,
});
const context = {
  stack,
  advisories: osv.advisories,
  osvStatus: osv.status,
};
const findings = attachValidatedFixes(
  snapshot,
  ALL_CHECKS.flatMap((check) => check(snapshot, context)),
);
const report = createScanReport(
  snapshot,
  stack,
  calculateScore(findings),
  osv.status,
  "2026-10-06T00:00:00.000Z",
);

await writeFile(
  resolve(outputPath),
  `${JSON.stringify(report, null, 2)}\n`,
);
