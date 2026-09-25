// dashboard/src/lib/social/trendProviders.ts

/**
 * Trend data source registry. This is the decoupling point the module's spec
 * requires: nothing in the scoring or UI layer is hard-wired to any one
 * provider. Phase 2 only has `manual-research` actually connected — the rest
 * are honest placeholders for Phase 3, which is gated on API access this
 * project doesn't have yet (Google Trends has no general-purpose public API;
 * Pinterest Trends and TikTok Creative Center both require partner-level
 * access this account doesn't hold). Never flip a provider to "connected"
 * without an actual working integration behind it.
 */

export type TrendProviderStatus = "connected" | "not_configured";

export interface TrendProviderInfo {
  id: string;
  label: string;
  status: TrendProviderStatus;
  note: string;
}

export const TREND_PROVIDERS: TrendProviderInfo[] = [
  {
    id: "manual-research",
    label: "Manual Research Entry",
    status: "connected",
    note: "A person logs a trend observation by hand, with their own 0-100 judgment on each scoring factor.",
  },
  {
    id: "google-trends",
    label: "Google Trends",
    status: "not_configured",
    note: "No general-purpose public API exists for this — would need a third-party data provider (e.g. SerpApi) under a paid plan.",
  },
  {
    id: "pinterest-trends",
    label: "Pinterest Trends",
    status: "not_configured",
    note: "Requires Pinterest Business API partner access, which this account does not have.",
  },
  {
    id: "tiktok-creative-center",
    label: "TikTok Creative Center",
    status: "not_configured",
    note: "No public API; would need manual export or a scraping-assisted workflow.",
  },
];
