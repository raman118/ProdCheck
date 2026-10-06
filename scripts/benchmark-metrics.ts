import type { ScanReport } from "../packages/shared/src/score";

export interface BenchmarkRun {
  readonly url: string;
  readonly durationMs: number;
  readonly report?: ScanReport;
  readonly error?: string;
}

export function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function summarizeBenchmark(runs: readonly BenchmarkRun[]) {
  const successful = runs.flatMap((run) => (run.report ? [run] : []));
  const findings = successful.flatMap(({ report }) => report!.findings);
  const counts = new Map<string, number>();
  for (const finding of findings)
    counts.set(finding.checkId, (counts.get(finding.checkId) ?? 0) + 1);
  const verified = findings.filter((finding) => finding.fix?.validated).length;
  const fixable = findings.filter((finding) => finding.fix).length;
  return {
    requested: runs.length,
    scanned: successful.length,
    failed: runs.length - successful.length,
    criticalFindingPercent: successful.length
      ? Math.round(
          (successful.filter(({ report }) =>
            report!.findings.some(({ severity }) => severity === "critical"),
          ).length /
            successful.length) *
            100,
        )
      : 0,
    topFindings: [...counts]
      .map(([checkId, count]) => ({ checkId, count }))
      .sort((a, b) => b.count - a.count || a.checkId.localeCompare(b.checkId))
      .slice(0, 5),
    medianScanTimeMs: median(successful.map(({ durationMs }) => durationMs)),
    patchValidationRate: fixable
      ? Math.round((verified / fixable) * 100)
      : null,
    patchCount: fixable,
    verifiedPatchCount: verified,
  };
}
