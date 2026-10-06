import { z } from "zod";

export const SeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);
export const CategorySchema = z.enum([
  "security",
  "data",
  "reliability",
  "observability",
  "quality",
]);

export const EvidenceSchema = z.object({
  file: z.string().min(1),
  lineStart: z.number().int().positive(),
  lineEnd: z.number().int().positive(),
  snippet: z.string(),
});

export const FixSchema = z.object({
  description: z.string().min(1),
  patch: z.string().min(1),
  validated: z.boolean(),
});

export const FindingSchema = z.object({
  id: z.string().min(1),
  checkId: z.string().regex(/^(SEC|DATA|REL|OBS|QUA)-\d{3}$/),
  severity: SeveritySchema,
  category: CategorySchema,
  title: z.string().min(1),
  explanation: z.string().min(1),
  evidence: z.array(EvidenceSchema),
  fix: FixSchema.optional(),
  confidence: z.number().min(0).max(1),
});

export const FindingListSchema = z.array(FindingSchema);

export type Severity = z.infer<typeof SeveritySchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Evidence = z.infer<typeof EvidenceSchema>;
export type Fix = z.infer<typeof FixSchema>;
export type Finding = z.infer<typeof FindingSchema>;
