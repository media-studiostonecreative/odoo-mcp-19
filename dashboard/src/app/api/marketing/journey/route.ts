import { NextResponse } from "next/server";
import { fetchLandingPageFunnel, type LandingPageFunnelRow } from "@/lib/shopify/analytics";
import { listIssues, type IssueRow } from "@/lib/issues/store";

export const dynamic = "force-dynamic";

// A landing page is "notable" (worth checking for a cause) if it gets meaningful
// traffic but essentially never converts. Below this session count, low
// conversion is just statistical noise from a handful of visits.
const NOTABLE_SESSIONS_THRESHOLD = 20;
const NOTABLE_CONVERSION_THRESHOLD = 0.005; // 0.5%

function pathnameFromIssuePage(page: string | null): string | null {
  if (!page) return null;
  try {
    return new URL(page).pathname || "/";
  } catch {
    return null; // page wasn't a full URL (e.g. "Odoo") — not matchable to a Shopify landing page
  }
}

export interface RelatedIssue {
  id: number;
  title: string;
  severity: IssueRow["severity"];
  frequency: number;
}

export interface JourneyFunnelRow extends LandingPageFunnelRow {
  notable: boolean;
  relatedIssues: RelatedIssue[];
}

export async function GET() {
  try {
    const result = await fetchLandingPageFunnel();
    if (!result.configured) return NextResponse.json(result);

    // Only retail (Shopify) issues can possibly correspond to a Shopify landing page.
    const activeRetailIssues = listIssues({ site: "retail", status: "active" });
    const issuesByPath = new Map<string, IssueRow[]>();
    for (const issue of activeRetailIssues) {
      const pathname = pathnameFromIssuePage(issue.page);
      if (!pathname) continue;
      const existing = issuesByPath.get(pathname);
      if (existing) existing.push(issue);
      else issuesByPath.set(pathname, [issue]);
    }

    const rows: JourneyFunnelRow[] = result.rows.map((row) => {
      const notable = row.sessions >= NOTABLE_SESSIONS_THRESHOLD && row.conversionRate <= NOTABLE_CONVERSION_THRESHOLD;
      const matched = notable ? (issuesByPath.get(row.landingPage) ?? []) : [];
      return {
        ...row,
        notable,
        relatedIssues: matched.map((i) => ({ id: i.id, title: i.title, severity: i.severity, frequency: i.frequency })),
      };
    });

    return NextResponse.json({ configured: true, rows });
  } catch (error) {
    console.error("[website-health] failed to load customer journey funnel:", error);
    return NextResponse.json({ error: "Unable to load Shopify funnel data." }, { status: 500 });
  }
}
