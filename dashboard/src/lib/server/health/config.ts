import "server-only";

import path from "node:path";

/**
 * Paths into the existing, separately-maintained monthly audit project.
 * Read-only from here — this module must never move, delete, or rewrite
 * anything under AUDIT_PROJECT_DIR.
 */
export const AUDIT_PROJECT_DIR =
  process.env.WEBSITE_AUDIT_DIR ?? path.join(process.env.HOME ?? "", "studiostone-website-audit");

export const AUDIT_REPORTS_DIR = path.join(AUDIT_PROJECT_DIR, "reports");
export const AUDIT_SCREENSHOTS_DIR = path.join(AUDIT_PROJECT_DIR, "screenshots");
export const AUDIT_LOGS_DIR = path.join(AUDIT_PROJECT_DIR, "logs");
export const AUDIT_SCRIPT_PATH = path.join(AUDIT_PROJECT_DIR, "run-monthly-audit.sh");

export const SITE_URLS = {
  retail: "https://studiostonecreative.com",
  wholesale: "https://studiostone.odoo.com",
};

export interface QuickScanPage {
  key: string;
  label: string;
  url: string;
  category: string;
}

/**
 * Pages the Quick Scan checks by default. Deliberately a small, high-value
 * set (not a full crawl) so the scan stays fast — see CLAUDE.md-equivalent
 * brief: "Aim for a relatively short runtime."
 */
export const DEFAULT_QUICK_SCAN_PAGES: QuickScanPage[] = [
  { key: "retail_home", label: "Homepage", url: SITE_URLS.retail, category: "navigation" },
  { key: "retail_shop", label: "Shop / Collections", url: `${SITE_URLS.retail}/collections/all`, category: "navigation" },
  { key: "retail_education", label: "Education (Classroom)", url: `${SITE_URLS.retail}/pages/classroom`, category: "journey" },
  { key: "retail_contact", label: "Contact information", url: `${SITE_URLS.retail}/policies/contact-information`, category: "content" },
  { key: "retail_cart", label: "Cart", url: `${SITE_URLS.retail}/cart`, category: "forms" },
  { key: "wholesale_home", label: "Wholesale Homepage", url: SITE_URLS.wholesale, category: "navigation" },
];

export const MOBILE_VIEWPORT = { width: 390, height: 844 };
export const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
