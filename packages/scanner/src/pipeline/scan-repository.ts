import type { ScanProgress } from "@prodcheck/shared/scan";
import type { ScanReport } from "@prodcheck/shared/score";
import { redactScanReport } from "@prodcheck/shared/redaction";
import { ALL_CHECKS, ALL_CHECK_IDS } from "../checks";
import { detectStack } from "../detect/stack-detector";
import { attachValidatedFixes } from "../fixes/fix-generator";
import { collectSecretValues } from "../checks/sec/sec-002-secrets";
import { createScanReport } from "../scoring/report";
import { calculateScore } from "../scoring/scorer";
import { fetchGitHubSnapshot } from "../snapshot/fetch-github";
import type { RepoSnapshot } from "../snapshot/types";
import { lookupOsvAdvisories } from "../vulnerabilities/osv-client";
import { rewriteFindingExplanations } from "../llm/explanations";

export interface ScanRepositoryOptions {
  readonly token?: string;
  readonly timeoutMs?: number;
  readonly deadlineMs?: number;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: typeof fetch;
  readonly onProgress?: (event: ScanProgress) => void;
  readonly now?: () => Date;
  readonly findCachedReport?: (
    snapshot: RepoSnapshot,
  ) => Promise<ScanReport | undefined>;
}

export async function scanRepository(
  repositoryUrl: string,
  options: ScanRepositoryOptions = {},
) {
  const emit = options.onProgress ?? (() => undefined);
  const deadlineController = new AbortController();
  const signal = options.signal
    ? AbortSignal.any([options.signal, deadlineController.signal])
    : deadlineController.signal;
  const deadline = setTimeout(
    () => deadlineController.abort(),
    options.deadlineMs ?? 45_000,
  );
  try {
    emit({
      stage: "fetching",
      message: "Fetching the public GitHub repository",
      progress: 5,
    });
    const snapshot: RepoSnapshot = await fetchGitHubSnapshot(repositoryUrl, {
      token: options.token,
      timeoutMs: options.timeoutMs ?? 35_000,
      signal,
      fetchImpl: options.fetchImpl,
    });
    emit({
      stage: "detecting",
      message: "Detecting frameworks and services",
      progress: 25,
    });
    const stack = detectStack(snapshot);
    const cached = await options.findCachedReport?.(snapshot);
    if (signal.aborted)
      throw new Error("Repository scan exceeded its time limit.");
    if (cached) {
      emit({
        stage: "scoring",
        message: "Loaded the cached report for this commit",
        progress: 90,
      });
      return cached;
    }
    const osv = await lookupOsvAdvisories(snapshot.dependencies, {
      fetchImpl: options.fetchImpl,
      signal,
    });
    const context = {
      stack,
      advisories: osv.advisories,
      osvStatus: osv.status,
    };
    const findings = [];
    for (const [index, check] of ALL_CHECKS.entries()) {
      if (signal.aborted)
        throw new Error("Repository scan exceeded its time limit.");
      const current = index + 1;
      emit({
        stage: "checking",
        message: `Running production check ${current} of ${ALL_CHECKS.length}`,
        checkId: ALL_CHECK_IDS[index] ?? "unknown",
        current,
        total: ALL_CHECKS.length,
        progress: 30 + Math.floor((current / ALL_CHECKS.length) * 55),
      });
      findings.push(...check(snapshot, context));
    }
    emit({
      stage: "scoring",
      message: "Scoring findings and validating fixes",
      progress: 90,
    });
    const withFixes = attachValidatedFixes(snapshot, findings);
    const report = createScanReport(
      snapshot,
      stack,
      calculateScore(withFixes),
      osv.status,
      (options.now ?? (() => new Date()))().toISOString(),
    );
    const explained = await rewriteFindingExplanations(report, {
      enabled: process.env.PRODCHECK_LLM_ENABLED === "true",
      openAiKey: process.env.OPENAI_API_KEY,
      anthropicKey: process.env.ANTHROPIC_API_KEY,
      fetchImpl: options.fetchImpl,
      signal,
    });
    return redactScanReport(explained, collectSecretValues(snapshot));
  } catch (error) {
    if (deadlineController.signal.aborted)
      throw new Error("Repository scan exceeded its time limit.");
    throw error;
  } finally {
    clearTimeout(deadline);
  }
}
