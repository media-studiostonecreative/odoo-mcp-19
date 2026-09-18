import "server-only";

/**
 * Transparent, rule-based scoring — no invented "AI score". Two scores:
 * computeHealthScore reflects the live issues board; computeAuditScore is
 * computed once at monthly-audit import time and stored on that audit_imports
 * row. Both are plain numbers now — the "why points were lost" per-category
 * breakdown from the pre-rebuild app was cut as redundant with the board itself.
 */

const SEVERITY_POINTS: Record<string, number> = { critical: 8, warning: 4, info: 1 };
const DEFAULT_SEVERITY_POINTS = 1;

const PRIORITY_POINTS: Record<string, number> = { P0: 10, P1: 5, P2: 2, P3: 1 };
const DEFAULT_PRIORITY_POINTS = 1;

export function computeHealthScore(issues: Array<{ severity: string }>): number {
  const total = issues.reduce((sum, i) => sum + (SEVERITY_POINTS[i.severity] ?? DEFAULT_SEVERITY_POINTS), 0);
  return Math.max(0, Math.min(100, 100 - total));
}

export function computeAuditScore(findings: Array<{ priority: string | null }>): number {
  const total = findings.reduce((sum, f) => sum + (PRIORITY_POINTS[f.priority ?? ""] ?? DEFAULT_PRIORITY_POINTS), 0);
  return Math.max(0, Math.min(100, 100 - total));
}
