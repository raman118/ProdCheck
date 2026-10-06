"use client";

import { ScanProgressSchema, type ScanProgress } from "@prodcheck/shared/scan";
import type { ScanReport } from "@prodcheck/shared/score";
import { useState } from "react";

function cacheKey(report: Pick<ScanReport, "repo">): string {
  return `prodcheck:${report.repo.owner}/${report.repo.name}/${report.repo.commitSha}`;
}

export function useScan() {
  const [progress, setProgress] = useState<ScanProgress>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function startScan(repositoryUrl: string): Promise<ScanReport | undefined> {
    setError("");
    setProgress(undefined);
    setBusy(true);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ repositoryUrl }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "The scan could not be started.");
      }
      if (!response.body) throw new Error("The server did not start a scan stream.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      let report: ScanReport | undefined;
      while (!finished) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        let separator = buffer.indexOf("\n\n");
        while (separator >= 0) {
          const frame = buffer.slice(0, separator);
          buffer = buffer.slice(separator + 2);
          const data = frame
            .split(/\r?\n/)
            .find((line) => line.startsWith("data: "))
            ?.slice(6);
          if (data) {
            const event = ScanProgressSchema.parse(JSON.parse(data));
            setProgress(event);
            if (event.stage === "error") throw new Error(event.message);
            if (event.stage === "complete") {
              report = event.report;
              window.sessionStorage.setItem(cacheKey(report), JSON.stringify(report));
              finished = true;
              break;
            }
          }
          separator = buffer.indexOf("\n\n");
        }
        if (done) finished = true;
      }
      if (!report) throw new Error("The scan stream ended before a report was returned.");
      return report;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The scan failed.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  return { progress, error, busy, startScan };
}
