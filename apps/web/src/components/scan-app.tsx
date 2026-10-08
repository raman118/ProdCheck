"use client";

import {
  ScanReportSchema,
  type ScanHistoryItem,
  type ScanReport,
} from "@prodcheck/shared/score";
import { redactScanReport } from "@prodcheck/shared/redaction";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowLeft, Check, Download, ExternalLink, Moon, RefreshCw, Share2, ShieldCheck, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { MarketingPage } from "./marketing-page";
import { BrandMark } from "./brand-mark";
import { useScan } from "./use-scan";
import { Button, Card } from "./ui";

function reportPath(report: ScanReport): string {
  return `/results/${encodeURIComponent(report.repo.owner)}/${encodeURIComponent(report.repo.name)}/${report.repo.commitSha}`;
}

function markdownReport(report: ScanReport): string {
  report = redactScanReport(report);
  const lines = [
    `# ProdCheck report: ${report.repo.owner}/${report.repo.name}`,
    "",
    `- Score: **${report.score}/100 (${report.scoreBand})**`,
    `- Commit: \`${report.repo.commitSha}\``,
    `- Scanned: ${report.scannedAt}`,
    `- Score version: ${report.scoreVersion}`,
    "",
    "## Category scores",
    "",
    ...report.categoryBreakdown.map(
      (category) =>
        `- ${category.category}: ${category.score}/100 (${category.findingCount} findings)`,
    ),
    "",
    "## Findings",
    "",
    ...(report.findings.length
      ? report.findings.flatMap((finding) => [
          `### ${finding.severity.toUpperCase()} — ${finding.title}`,
          "",
          finding.explanation,
          "",
          ...finding.evidence.map(
            (item) =>
              `- \`${item.file}:${item.lineStart}-${item.lineEnd}\` ${item.snippet}`,
          ),
          ...(finding.fix
            ? ["", `Verified fix: ${finding.fix.description}`]
            : []),
          "",
        ])
      : ["No findings were reported."]),
  ];
  return lines.join("\n");
}

function downloadText(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function Landing() {
  const router = useRouter();
  const { progress, error, busy, startScan } = useScan();
  const [url, setUrl] = useState("");
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");
  }, []);

  function toggleTheme() {
    const next = !light;
    setLight(next);
    document.documentElement.dataset.theme = next ? "light" : "dark";
    localStorage.setItem("prodcheck-theme", next ? "light" : "dark");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void startScan(url).then((report) => {
      if (report) router.push(reportPath(report));
    });
  }

  function startFromExample(repositoryUrl: string) {
    setUrl(repositoryUrl);
    void startScan(repositoryUrl).then((report) => {
      if (report) router.push(reportPath(report));
    });
  }

  return (
    <MarketingPage
      url={url}
      onChange={setUrl}
      onSubmit={submit}
      onStart={startFromExample}
      busy={busy}
      error={error}
      progress={progress}
      light={light}
      onThemeToggle={toggleTheme}
    />
  );
}

function Header() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");
  }, []);
  return (
    <header className="topbar container">
      <Link className="brand" href="/" aria-label="ProdCheck home">
        <span className="brand-mark"><BrandMark /></span>
        ProdCheck
      </Link>
      <Button
        variant="secondary"
        aria-label={`Switch to ${light ? "dark" : "light"} mode`}
        onClick={() => {
          const next = !light;
          setLight(next);
          document.documentElement.dataset.theme = next ? "light" : "dark";
          localStorage.setItem("prodcheck-theme", next ? "light" : "dark");
        }}
      >
        {light ? "Dark theme" : "Light theme"}
      </Button>
    </header>
  );
}

function ReportThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");
  }, []);
  const Icon = light ? Moon : Sun;
  return (
    <button
      className="report-tool-button report-theme-toggle"
      type="button"
      aria-label={`Switch to ${light ? "dark" : "light"} theme`}
      onClick={() => {
        const next = !light;
        setLight(next);
        document.documentElement.dataset.theme = next ? "light" : "dark";
        localStorage.setItem("prodcheck-theme", next ? "light" : "dark");
      }}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}

function Gauge({ report }: { report: ScanReport }) {
  const circumference = 2 * Math.PI * 62;
  const offset = circumference * (1 - report.score / 100);
  const reduceMotion = useReducedMotion();
  const scoreValue = useMotionValue(0);
  const roundedScore = useTransform(scoreValue, (current) => Math.round(current));
  const [shownScore, setShownScore] = useState(0);
  useEffect(() => {
    const unsubscribe = roundedScore.on("change", setShownScore);
    const controls = animate(scoreValue, report.score, {
      duration: reduceMotion ? 0 : 1.1,
      ease: "easeOut",
    });
    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [reduceMotion, report.score, roundedScore, scoreValue]);
  return (
    <div
      className="gauge"
      role="img"
      aria-label={`Production readiness score ${report.score} out of 100, ${report.scoreBand}`}
    >
      <div className="gauge-wrap">
        <svg viewBox="0 0 150 150" aria-hidden="true">
          <circle className="track" cx="75" cy="75" r="62" />
          <circle
            className={`value score-value-${report.scoreBand.toLowerCase().replaceAll(" ", "-")}`}
            cx="75"
            cy="75"
            r="62"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <motion.div className="gauge-score">{shownScore}</motion.div>
      </div>
      <div className="gauge-label">{report.scoreBand}</div>
    </div>
  );
}

function Findings({ report }: { report: ScanReport }) {
  const [openFix, setOpenFix] = useState<string>();
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  async function copyPatch(id: string, patch: string) {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(patch);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopyError(
        "Clipboard access failed. Select and copy the patch from Show fix.",
      );
    }
  }

  return (
    <section aria-labelledby="findings-title">
      {copyError && (
        <p className="error mb-3" role="alert">
          {copyError}
        </p>
      )}
      <div className="findings-heading">
        <h2 id="findings-title">
          Findings <span className="muted">({report.findings.length})</span>
        </h2>
        <span className="muted text-xs">Sorted by severity</span>
      </div>
      {report.findings.length === 0 ? (
        <Card className="empty">
          <h3>Looking good.</h3>
          <p className="muted">No issues were found by the current checks.</p>
        </Card>
      ) : (
        report.findings.map((finding) => (
          <Card className="finding" key={finding.id}>
            <div className="finding-head">
              <div>
                <div className="eyebrow">
                  {finding.checkId} · {finding.category}
                </div>
                <h3 className="mt-2">{finding.title}</h3>
                <p>{finding.explanation}</p>
              </div>
              <span className={`severity severity-${finding.severity}`}>
                {finding.severity}
              </span>
            </div>
            {finding.evidence.map((item, index) => (
              <details
                className="evidence"
                key={`${item.file}:${item.lineStart}:${index}`}
              >
                <summary>
                  {item.file}:{item.lineStart}
                  {item.lineEnd !== item.lineStart ? `–${item.lineEnd}` : ""}
                </summary>
                <pre>{item.snippet || "No source snippet available."}</pre>
              </details>
            ))}
            {finding.fix && (
              <div className="fix-actions">
                <Button
                  variant="secondary"
                  aria-expanded={openFix === finding.id}
                  onClick={() =>
                    setOpenFix(openFix === finding.id ? undefined : finding.id)
                  }
                >
                  {openFix === finding.id ? "Hide fix" : "Show fix"} ·{" "}
                  {finding.fix.validated ? "Verified" : "Suggested"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void copyPatch(finding.id, finding.fix!.patch)}
                >
                  {copied === finding.id ? "Copied" : "Copy patch"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    downloadText(
                      `${finding.checkId.toLowerCase()}-fix.patch`,
                      finding.fix!.patch,
                      "text/x-diff",
                    )
                  }
                >
                  Download .patch
                </Button>
                {openFix === finding.id && (
                  <div className="w-full">
                    <p className="mt-3">{finding.fix.description}</p>
                    <pre
                      className="patch"
                      aria-label={`Patch for ${finding.title}`}
                    >
                      {finding.fix.patch}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))
      )}
    </section>
  );
}

export function ReportView({
  report,
  history = [],
}: {
  report: ScanReport;
  history?: readonly ScanHistoryItem[];
}) {
  const repository = `${report.repo.owner}/${report.repo.name}`;
  const router = useRouter();
  const { progress, error, busy, startScan } = useScan();
  const [shareState, setShareState] = useState("");
  const [exportsOpen, setExportsOpen] = useState(false);
  const scannedAt = new Date(report.scannedAt);
  const criticalCount = report.findings.filter(
    (finding) => finding.severity === "critical",
  ).length;
  const highCount = report.findings.filter(
    (finding) => finding.severity === "high",
  ).length;

  async function shareReport() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareState("Link copied");
    } catch {
      setShareState("Copy this page URL to share");
    }
    window.setTimeout(() => setShareState(""), 2200);
  }

  async function rescanRepository() {
    const nextReport = await startScan(`https://github.com/${repository}`);
    if (nextReport) router.push(reportPath(nextReport));
  }

  return (
    <>
      <header className="report-stickybar">
        <div className="report-sticky-inner shell">
          <Link className="brand report-brand" href="/" aria-label="ProdCheck home">
            <span className="brand-mark"><BrandMark /></span>
            <span>prodcheck</span>
          </Link>
          <div className="report-identity">
            <span className="report-repo-name">{repository}</span>
            <span className="report-ref" title="Report is pinned to this immutable commit">
              ref <code>{report.repo.commitSha.slice(0, 8)}</code>
            </span>
            <span className="report-ref"><span className="branch-pip" /> commit pinned</span>
            <time className="report-scan-time" dateTime={report.scannedAt}>
              {scannedAt.toLocaleString()}
            </time>
          </div>
          <div className="report-toolbar">
            <button
              className="report-tool-button"
              type="button"
              onClick={() => void rescanRepository()}
              disabled={busy}
            >
              <RefreshCw aria-hidden="true" className={busy ? "spin-icon" : ""} />
              <span>{busy ? "Scanning" : "Re-scan"}</span>
            </button>
            <button className="report-tool-button" type="button" onClick={() => void shareReport()}>
              {shareState === "Link copied" ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
              <span>{shareState || "Share"}</span>
            </button>
            <div className="export-menu">
              <button
                className="report-tool-button"
                type="button"
                aria-expanded={exportsOpen}
                onClick={() => setExportsOpen(!exportsOpen)}
              >
                <Download aria-hidden="true" /><span>Export</span>
              </button>
              {exportsOpen && (
                <div className="export-popover">
                  <button type="button" onClick={() => downloadText(`${report.repo.name}-prodcheck.md`, markdownReport(report), "text/markdown")}>
                    <Download aria-hidden="true" /> Markdown report
                  </button>
                  <button type="button" onClick={() => downloadText(`${report.repo.name}-prodcheck.json`, JSON.stringify(redactScanReport(report), null, 2), "application/json")}>
                    <Download aria-hidden="true" /> JSON report
                  </button>
                </div>
              )}
            </div>
            <ReportThemeToggle />
          </div>
        </div>
      </header>
      <main className="shell results-page">
        {(error || progress) && (
          <div className="result-feedback" role={error ? "alert" : "status"}>
            {error || progress?.message}
            {progress && !error && <span>{progress.progress}%</span>}
          </div>
        )}
        <section className="results-intro">
          <div>
            <div className="result-kicker"><ShieldCheck aria-hidden="true" /> Production readiness report</div>
            <h1>{repository}</h1>
            <p>Here’s what the current snapshot says about production readiness.</p>
          </div>
          <Link className="back-to-scan" href="/"><ArrowLeft aria-hidden="true" /> New repository</Link>
        </section>
        <section className="results-overview-card" aria-label="Readiness score and category scores">
          <div className="score-summary">
            <div className="score-summary-label">Readiness score</div>
            <Gauge report={report} />
            <div className={`score-band score-band-${report.scoreBand.toLowerCase().replaceAll(" ", "-")}`}>
              {report.scoreBand}
            </div>
            <p className="score-caption">Calculated from deterministic checks</p>
          </div>
          <div className="score-breakdown">
            <div className="breakdown-heading">
              <div><h2>Category breakdown</h2><p>What contributes to your score</p></div>
              <span>score v{report.scoreVersion}</span>
            </div>
            <div className="categories" aria-label="Category scores">
              {report.categoryBreakdown.map((item) => (
                <div className="category" key={item.category}>
                  <div className="category-top">
                    <span>{item.category}</span><strong>{item.score}</strong>
                  </div>
                  <div className="progress-track" role="progressbar" aria-label={`${item.category} score`} aria-valuenow={item.score} aria-valuemin={0} aria-valuemax={100}>
                    <div className="progress-bar" style={{ width: `${item.score}%` }} />
                  </div>
                  <div className="muted category-caption">{item.findingCount} findings</div>
                </div>
              ))}
            </div>
            <div className="finding-summary-row">
              <div><strong>{report.findings.length}</strong><span>Total findings</span></div>
              <div><strong className="severity-text-critical">{criticalCount}</strong><span>Critical</span></div>
              <div><strong className="severity-text-high">{highCount}</strong><span>High</span></div>
              {report.history?.previousCommitSha && (
                <div className="since-last-scan"><strong>+{report.history.newFindingsCount}</strong><span>Since last scan</span></div>
              )}
            </div>
          </div>
        </section>
        {history.length > 0 && (
          <Card className="history-card">
            <div className="history-heading"><div><span className="section-kicker">Repository timeline</span><h2>Scan history</h2></div><span>{history.length} snapshots</span></div>
            <ol>
              {history.map((item) => (
                <li key={item.commitSha}>
                  <Link
                    className="history-sha"
                    href={`/results/${encodeURIComponent(report.repo.owner)}/${encodeURIComponent(report.repo.name)}/${item.commitSha}`}
                  >
                    <code>{item.commitSha.slice(0, 12)}</code><ExternalLink aria-hidden="true" />
                  </Link>
                  <span className="history-score">{item.score}/100 <i>·</i> {item.scoreBand}</span>
                  <time dateTime={item.scannedAt}>{new Date(item.scannedAt).toLocaleDateString()}</time>
                  <span className="history-new">+{item.newFindingsCount} new</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
        <Findings report={report} />
      </main>
      <Footer />
    </>
  );
}

function ResultsFromCache({
  owner,
  repo,
  sha,
  initialReport,
  history,
}: {
  owner: string;
  repo: string;
  sha: string;
  initialReport?: ScanReport;
  history?: readonly ScanHistoryItem[];
}) {
  const [report, setReport] = useState<ScanReport | undefined>(initialReport);
  useEffect(() => {
    const raw = sessionStorage.getItem(`prodcheck:${owner}/${repo}/${sha}`);
    if (!raw) return;
    try {
      setReport(ScanReportSchema.parse(JSON.parse(raw)));
    } catch {
      sessionStorage.removeItem(`prodcheck:${owner}/${repo}/${sha}`);
    }
  }, [owner, repo, sha]);
  if (initialReport)
    return <ReportView report={initialReport} history={history} />;
  if (!report)
    return (
      <>
        <Header />
        <main className="container results">
          <Card className="empty">
            <div className="eyebrow">Report unavailable</div>
            <h1>This report is not cached in this browser.</h1>
            <p className="muted">
              Run a new scan or check the repository owner, name, and commit
              SHA.
            </p>
            <Link className="button button-primary mt-4 no-underline" href="/">
              Scan a repository
            </Link>
          </Card>
        </main>
        <Footer />
      </>
    );
  return <ReportView report={report} />;
}

function Footer() {
  return (
    <footer className="report-footer">
      <div className="shell report-footer-main">
        <div>
          <Link className="brand" href="/">
            <span className="brand-mark"><BrandMark /></span>
            <span>prodcheck</span>
          </Link>
          <p>Production readiness, with receipts.</p>
        </div>
        <div><span>Scanner</span><strong>0.0.0</strong></div>
        <div><span>Score model</span><strong>Version 1</strong></div>
        <div><span>Repository handling</span><strong>Read-only · never executed</strong></div>
      </div>
      <div className="shell report-footer-bottom"><span>Reports are pinned to an immutable commit SHA.</span><Link href="/#checks">View all 19 checks</Link></div>
    </footer>
  );
}

export function ScanApp() {
  useEffect(() => {
    const saved = localStorage.getItem("prodcheck-theme");
    if (saved === "light" || saved === "dark")
      document.documentElement.dataset.theme = saved;
  }, []);
  return <Landing />;
}

export function ScanResults({
  owner,
  repo,
  sha,
  initialReport,
  history,
}: {
  owner: string;
  repo: string;
  sha: string;
  initialReport?: ScanReport;
  history?: readonly ScanHistoryItem[];
}) {
  useEffect(() => {
    const saved = localStorage.getItem("prodcheck-theme");
    if (saved === "light" || saved === "dark")
      document.documentElement.dataset.theme = saved;
  }, []);
  return (
    <ResultsFromCache
      owner={owner}
      repo={repo}
      sha={sha}
      initialReport={initialReport}
      history={history}
    />
  );
}
