import type { ScanHistoryItem, ScanReport } from "@prodcheck/shared/score";

export interface SaveReportResult {
  readonly report: ScanReport;
  readonly created: boolean;
}

export interface ScanStore {
  getReport(
    owner: string,
    repo: string,
    commitSha: string,
  ): Promise<ScanReport | undefined>;
  saveReport(report: ScanReport): Promise<SaveReportResult>;
  listHistory(
    owner: string,
    repo: string,
    limit?: number,
  ): Promise<ScanHistoryItem[]>;
  consumeRateLimit(
    ipKey: string,
    nowMs: number,
    maxRequests: number,
    windowMs: number,
  ): Promise<boolean>;
}
