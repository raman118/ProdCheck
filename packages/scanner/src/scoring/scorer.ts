import type { Category, Finding } from "@prodcheck/shared/finding";
import type { ScoreBand, ScoreResult } from "@prodcheck/shared/score";
import {
  CategoryScoreSchema,
  ScoreResultSchema,
} from "@prodcheck/shared/score";

export const SCORE_VERSION = 1;
export const SEVERITY_DEDUCTIONS = {
  critical: 15,
  high: 8,
  medium: 4,
  low: 1,
  info: 0,
} as const;
export const CATEGORY_DEDUCTION_CAPS: Readonly<Record<Category, number>> = {
  security: 40,
  data: 35,
  reliability: 30,
  observability: 20,
  quality: 20,
};

const CATEGORY_ORDER: readonly Category[] = [
  "security",
  "data",
  "reliability",
  "observability",
  "quality",
];
const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
} as const;

export interface ScoredFindings extends ScoreResult {
  readonly findings: readonly Finding[];
}

function bandForScore(score: number): ScoreBand {
  if (score < 40) return "Critical";
  if (score < 70) return "At risk";
  if (score < 90) return "Good";
  return "Production ready";
}

function evidencePath(finding: Finding): string {
  return finding.evidence[0]?.file ?? "";
}

export function sortFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort(
    (left, right) =>
      SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
      left.checkId.localeCompare(right.checkId) ||
      evidencePath(left).localeCompare(evidencePath(right)) ||
      (left.evidence[0]?.lineStart ?? 0) -
        (right.evidence[0]?.lineStart ?? 0) ||
      left.id.localeCompare(right.id),
  );
}

export function calculateScore(findings: readonly Finding[]): ScoredFindings {
  const orderedFindings = sortFindings(findings);
  const byCheck = new Map<string, Finding[]>();
  for (const finding of orderedFindings) {
    const group = byCheck.get(finding.checkId) ?? [];
    group.push(finding);
    byCheck.set(finding.checkId, group);
  }

  const rawDeductions = new Map<Category, number>(
    CATEGORY_ORDER.map((category) => [category, 0]),
  );
  for (const group of byCheck.values()) {
    const chargeable = [...group].sort(
      (left, right) =>
        SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
        left.id.localeCompare(right.id),
    );
    for (const [index, finding] of chargeable.entries()) {
      const base = SEVERITY_DEDUCTIONS[finding.severity];
      if (base === 0) continue;
      const deduction = base * 0.5 ** index;
      rawDeductions.set(
        finding.category,
        (rawDeductions.get(finding.category) ?? 0) + deduction,
      );
    }
  }

  const categoryBreakdown = CATEGORY_ORDER.map((category) => {
    const cap = CATEGORY_DEDUCTION_CAPS[category];
    const deduction = Math.min(cap, rawDeductions.get(category) ?? 0);
    const categoryFindings = orderedFindings.filter(
      (finding) => finding.category === category,
    );
    return CategoryScoreSchema.parse({
      category,
      score: Math.max(0, Math.round(100 - deduction)),
      deduction: Number(deduction.toFixed(4)),
      cap,
      findingCount: categoryFindings.length,
      severityCounts: {
        critical: categoryFindings.filter(
          (finding) => finding.severity === "critical",
        ).length,
        high: categoryFindings.filter((finding) => finding.severity === "high")
          .length,
        medium: categoryFindings.filter(
          (finding) => finding.severity === "medium",
        ).length,
        low: categoryFindings.filter((finding) => finding.severity === "low")
          .length,
        info: categoryFindings.filter((finding) => finding.severity === "info")
          .length,
      },
    });
  });
  const deductions = categoryBreakdown.reduce(
    (total, category) => total + category.deduction,
    0,
  );
  const score = Math.max(0, Math.min(100, Math.round(100 - deductions)));
  const result = ScoreResultSchema.parse({
    score,
    scoreVersion: SCORE_VERSION,
    band: bandForScore(score),
    categoryBreakdown,
  });
  return { ...result, findings: orderedFindings };
}
