import "server-only";

import { getHealthDb } from "./db";
import { listIssues } from "./issues";
import { scoreFromIssues } from "./scoring";
import { listAudits, importNewAuditReports } from "./auditImport";
import { getLatestScan } from "./quickScan";

export interface HealthOverview {
  score: ReturnType<typeof scoreFromIssues>;
  openCritical: number;
  openWarning: number;
  openContentIssues: number;
  lastQuickScan: ReturnType<typeof getLatestScan>;
  lastFullAudit: { audit_date: string; health_score: number | null; status: string | null } | null;
  nextScheduledAudit: string | null;
  analyticsConnected: boolean;
}

export function getHealthOverview(): HealthOverview {
  const db = getHealthDb();
  // Import any new monthly audit reports first so their findings are reflected
  // in the score/critical/warning counts below, not just in lastFullAudit.
  importNewAuditReports();
  const openIssues = listIssues({ status: "active" });
  const score = scoreFromIssues(
    openIssues.map((i) => ({ severity: i.severity, category: i.category, title: i.title })),
  );

  const audits = listAudits();
  const lastFullAudit = audits[0]
    ? { audit_date: audits[0].audit_date, health_score: audits[0].health_score, status: audits[0].status }
    : null;

  // Monthly audit runs on the 1st at 09:00 (see com.studiostone.monthly-website-audit.plist).
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= 1 && now.getHours() >= 9 ? 1 : 0), 1, 9, 0, 0);
  const nextScheduledAudit = nextMonth.toISOString();

  const contentIssues = db
    .prepare(
      `SELECT COUNT(*) as n FROM issues WHERE status IN ('open','acknowledged') AND category IN ('content','localization')`,
    )
    .get() as { n: number };

  return {
    score,
    openCritical: openIssues.filter((i) => i.severity === "critical").length,
    openWarning: openIssues.filter((i) => i.severity === "warning").length,
    openContentIssues: contentIssues.n,
    lastQuickScan: getLatestScan("quick"),
    lastFullAudit,
    nextScheduledAudit,
    analyticsConnected: false, // No Plausible/GA script detected on the live site as of the last inspection.
  };
}
