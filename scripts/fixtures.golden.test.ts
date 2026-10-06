import { describe, expect, it } from "vitest";
import { ALL_CHECKS } from "../packages/scanner/src/checks";
import { detectStack } from "../packages/scanner/src/detect/stack-detector";
import { calculateScore } from "../packages/scanner/src/scoring/scorer";
import { attachValidatedFixes } from "../packages/scanner/src/fixes/fix-generator";
import { lookupOsvAdvisories } from "../packages/scanner/src/vulnerabilities/osv-client";
import { loadFixtureSnapshot } from "./fixtures/load-fixture";

const fixtureNames = [
  "vulnerable-nextjs-supabase",
  "missing-auth",
  "open-rls",
  "leaky-secrets",
  "clean-production",
  "mixed",
] as const;

describe("repository golden fixtures", () => {
  it.each(fixtureNames)(
    "locks findings and score for %s",
    async (fixtureName) => {
      const snapshot = await loadFixtureSnapshot(fixtureName);
      const stack = detectStack(snapshot);
      const osv = await lookupOsvAdvisories(snapshot.dependencies, {
        fetchImpl: (async () => {
          throw new Error("Golden tests never use the network.");
        }) as typeof fetch,
      });
      const context = {
        stack,
        advisories: osv.advisories,
        osvStatus: osv.status,
      };
      const scored = calculateScore(
        ALL_CHECKS.flatMap((check) => check(snapshot, context)),
      );
      if (fixtureName === "missing-auth") {
        expect(
          attachValidatedFixes(snapshot, scored.findings).some(
            (item) => item.fix?.validated,
          ),
        ).toBe(true);
      }
      expect({
        score: scored.score,
        findings: scored.findings.map(({ id }) => id),
      }).toMatchSnapshot();
    },
  );
});
