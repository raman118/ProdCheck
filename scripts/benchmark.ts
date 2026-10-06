import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { scanRepository } from "../packages/scanner/src/pipeline/scan-repository";
import { summarizeBenchmark, type BenchmarkRun } from "./benchmark-metrics";

const urlsPath = process.env.PRODCHECK_BENCHMARK_URLS ?? "benchmarks/urls.txt";
const urls = (await readFile(urlsPath, "utf8"))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("#"));
const queue = [...urls];
const runs: BenchmarkRun[] = [];
async function worker() {
  while (queue.length) {
    const url = queue.shift();
    if (!url) return;
    const started = performance.now();
    try {
      const report = await scanRepository(url, {
        token: process.env.GITHUB_TOKEN,
        deadlineMs: 45_000,
      });
      runs.push({
        url,
        durationMs: Math.round(performance.now() - started),
        report,
      });
      process.stdout.write(`✓ ${url}: ${report.score}/100\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scan failed";
      runs.push({
        url,
        durationMs: Math.round(performance.now() - started),
        error: message,
      });
      process.stdout.write(`✗ ${url}: ${message}\n`);
    }
  }
}
await Promise.all([worker(), worker()]);
runs.sort((a, b) => urls.indexOf(a.url) - urls.indexOf(b.url));
const summary = summarizeBenchmark(runs);
await mkdir("benchmarks", { recursive: true });
await writeFile(
  "benchmarks/results.json",
  `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, runs }, null, 2)}\n`,
);
const top =
  summary.topFindings
    .map(({ checkId, count }) => `| ${checkId} | ${count} |`)
    .join("\n") || "| — | 0 |";
const markdown = `# ProdCheck benchmark\n\nGenerated: ${new Date().toISOString()}\n\n- Repositories scanned: ${summary.scanned}/${summary.requested} (${summary.failed} failed)\n- Repositories with critical findings: ${summary.criticalFindingPercent}%\n- Median scan time: ${summary.medianScanTimeMs} ms\n- Verified patch validation rate: ${summary.patchValidationRate === null ? "n/a" : `${summary.patchValidationRate}%`} (${summary.verifiedPatchCount}/${summary.patchCount})\n\n| Most common finding | Count |\n| --- | ---: |\n${top}\n`;
await writeFile("benchmarks/results.md", markdown);
process.stdout.write(markdown);
