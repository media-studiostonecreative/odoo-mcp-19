import "server-only";

/**
 * Transparent, rule-based scoring — no invented "AI score". Every point lost
 * traces back to a specific open issue or audit finding so the UI can show
 * "why points were lost" per category.
 */

export const HEALTH_CATEGORIES = [
  "technical",
  "forms",
  "navigation",
  "performance",
  "content",
  "localization",
  "ux",
  "accessibility",
  "journey",
] as const;

export type HealthCategory = (typeof HEALTH_CATEGORIES)[number];

const SEVERITY_POINTS: Record<string, number> = {
  critical: 8,
  warning: 4,
  info: 1,
};
const DEFAULT_SEVERITY_POINTS = 1;

const PRIORITY_POINTS: Record<string, number> = {
  P0: 10,
  P1: 5,
  P2: 2,
  P3: 1,
};
const DEFAULT_PRIORITY_POINTS = 1;

export interface Deduction {
  label: string;
  category: string;
  points: number;
}

export interface ScoreResult {
  overall: number;
  deductions: Deduction[];
  byCategory: Record<HealthCategory, { score: number; deductions: Deduction[] }>;
}

function normalizeCategory(raw: string | null | undefined): HealthCategory {
  const c = (raw ?? "").toLowerCase();
  return (HEALTH_CATEGORIES as readonly string[]).includes(c) ? (c as HealthCategory) : "technical";
}

export function scoreFromIssues(
  issues: Array<{ severity: string; category: string | null; title: string }>,
): ScoreResult {
  const deductions: Deduction[] = issues.map((issue) => ({
    label: issue.title,
    category: normalizeCategory(issue.category),
    points: SEVERITY_POINTS[issue.severity] ?? DEFAULT_SEVERITY_POINTS,
  }));
  return buildResult(deductions);
}

export function scoreFromFindings(
  findings: Array<{ priority: string | null; category: string | null; title: string }>,
): ScoreResult {
  const deductions: Deduction[] = findings.map((f) => ({
    label: f.title,
    category: normalizeCategory(f.category),
    points: PRIORITY_POINTS[f.priority ?? ""] ?? DEFAULT_PRIORITY_POINTS,
  }));
  return buildResult(deductions);
}

function buildResult(deductions: Deduction[]): ScoreResult {
  const byCategory = {} as Record<HealthCategory, { score: number; deductions: Deduction[] }>;
  for (const cat of HEALTH_CATEGORIES) {
    byCategory[cat] = { score: 100, deductions: [] };
  }
  for (const d of deductions) {
    const bucket = byCategory[d.category as HealthCategory] ?? byCategory.technical;
    bucket.deductions.push(d);
    bucket.score = Math.max(0, bucket.score - d.points);
  }
  const totalDeduction = deductions.reduce((sum, d) => sum + d.points, 0);
  const overall = Math.max(0, Math.min(100, 100 - totalDeduction));
  return { overall, deductions, byCategory };
}
