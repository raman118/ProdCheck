import { z } from "zod";
import { CategorySchema, FindingListSchema, SeveritySchema } from "./finding";

export const ScoreBandSchema = z.enum([
  "Critical",
  "At risk",
  "Good",
  "Production ready",
]);

export const CategoryScoreSchema = z.object({
  category: CategorySchema,
  score: z.number().int().min(0).max(100),
  deduction: z.number().min(0),
  cap: z.number().positive(),
  findingCount: z.number().int().nonnegative(),
  severityCounts: z.record(SeveritySchema, z.number().int().nonnegative()),
});

export const ScoreResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  scoreVersion: z.number().int().positive(),
  band: ScoreBandSchema,
  categoryBreakdown: z.array(CategoryScoreSchema),
});

export const StackSummarySchema = z.object({
  node: z.boolean(),
  frameworks: z.array(z.enum(["nextjs", "react"])),
  supabase: z.boolean(),
  packageManager: z.enum(["pnpm", "yarn", "npm", "bun", "unknown"]),
  packageCount: z.number().int().nonnegative(),
  malformedPackageJson: z.boolean(),
});

export const ScanHistoryDeltaSchema = z.object({
  newFindingsCount: z.number().int().nonnegative(),
  previousCommitSha: z
    .string()
    .regex(/^[a-f0-9]{40}$/i)
    .nullable(),
});

export const ScanHistoryItemSchema = z.object({
  commitSha: z.string().regex(/^[a-f0-9]{40}$/i),
  scannedAt: z.string().datetime(),
  score: z.number().int().min(0).max(100),
  scoreBand: ScoreBandSchema,
  newFindingsCount: z.number().int().nonnegative(),
});

export const ScanReportSchema = z.object({
  repo: z.object({
    owner: z.string().min(1),
    name: z.string().min(1),
    commitSha: z.string().regex(/^[a-f0-9]{40}$/i),
  }),
  scannedAt: z.string().datetime(),
  stack: StackSummarySchema,
  score: z.number().int().min(0).max(100),
  scoreVersion: z.number().int().positive(),
  scoreBand: ScoreBandSchema,
  categoryBreakdown: z.array(CategoryScoreSchema),
  findings: FindingListSchema,
  osvStatus: z.enum(["online", "offline", "skipped"]),
  history: ScanHistoryDeltaSchema.optional(),
});

export type ScoreBand = z.infer<typeof ScoreBandSchema>;
export type CategoryScore = z.infer<typeof CategoryScoreSchema>;
export type ScoreResult = z.infer<typeof ScoreResultSchema>;
export type StackSummary = z.infer<typeof StackSummarySchema>;
export type ScanHistoryDelta = z.infer<typeof ScanHistoryDeltaSchema>;
export type ScanHistoryItem = z.infer<typeof ScanHistoryItemSchema>;
export type ScanReport = z.infer<typeof ScanReportSchema>;
