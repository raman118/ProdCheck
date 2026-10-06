export const PRODUCT_NAME = "ProdCheck";

export {
  CategorySchema,
  EvidenceSchema,
  FindingListSchema,
  FindingSchema,
  FixSchema,
  SeveritySchema,
} from "./finding";
export type { Category, Evidence, Finding, Fix, Severity } from "./finding";
export {
  CategoryScoreSchema,
  ScanReportSchema,
  ScanHistoryDeltaSchema,
  ScanHistoryItemSchema,
  ScoreBandSchema,
  ScoreResultSchema,
  StackSummarySchema,
} from "./score";
export type {
  CategoryScore,
  ScanReport,
  ScanHistoryDelta,
  ScanHistoryItem,
  ScoreBand,
  ScoreResult,
  StackSummary,
} from "./score";
export { ScanProgressSchema, ScanRequestSchema } from "./scan";
export type { ScanProgress, ScanRequest } from "./scan";
export { redactScanReport, redactSecretText } from "./redaction";
