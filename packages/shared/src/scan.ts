import { z } from "zod";
import { ScanReportSchema } from "./score";

export const ScanRequestSchema = z
  .object({
    repositoryUrl: z.string().trim().min(1).max(2_000),
  })
  .strict();

export const ScanProgressSchema = z.discriminatedUnion("stage", [
  z.object({
    stage: z.literal("fetching"),
    message: z.string(),
    progress: z.number().int().min(0).max(100),
  }),
  z.object({
    stage: z.literal("detecting"),
    message: z.string(),
    progress: z.number().int().min(0).max(100),
  }),
  z.object({
    stage: z.literal("checking"),
    message: z.string(),
    checkId: z.string(),
    current: z.number().int().positive(),
    total: z.number().int().positive(),
    progress: z.number().int().min(0).max(100),
  }),
  z.object({
    stage: z.literal("scoring"),
    message: z.string(),
    progress: z.number().int().min(0).max(100),
  }),
  z.object({
    stage: z.literal("complete"),
    message: z.string(),
    progress: z.literal(100),
    report: ScanReportSchema,
  }),
  z.object({
    stage: z.literal("error"),
    message: z.string(),
    progress: z.number().int().min(0).max(100),
  }),
]);

export type ScanRequest = z.infer<typeof ScanRequestSchema>;
export type ScanProgress = z.infer<typeof ScanProgressSchema>;
