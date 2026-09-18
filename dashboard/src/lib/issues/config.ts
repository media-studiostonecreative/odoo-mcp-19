import "server-only";

import path from "node:path";

/** Paths into the separately-maintained monthly audit project. Read-only from here. */
export const AUDIT_PROJECT_DIR = process.env.WEBSITE_AUDIT_DIR ?? path.join(process.env.HOME ?? "", "studiostone-website-audit");
export const AUDIT_REPORTS_DIR = path.join(AUDIT_PROJECT_DIR, "reports");

export const SITE_URLS = {
  retail: "https://studiostonecreative.com",
  wholesale: "https://studiostone.odoo.com",
};

export interface QuickScanPage {
  key: string;
  label: string;
  url: string;
  category: string;
  site: "retail" | "wholesale";
}

/** Deliberately a small, high-value set (not a full crawl) so the scan stays fast. */
export const DEFAULT_QUICK_SCAN_PAGES: QuickScanPage[] = [
  { key: "retail_home", label: "Homepage", url: SITE_URLS.retail, category: "navigation", site: "retail" },
  { key: "retail_shop", label: "Shop / Collections", url: `${SITE_URLS.retail}/collections/all`, category: "navigation", site: "retail" },
  { key: "retail_education", label: "Education (Classroom)", url: `${SITE_URLS.retail}/pages/classroom`, category: "journey", site: "retail" },
  { key: "retail_contact", label: "Contact information", url: `${SITE_URLS.retail}/policies/contact-information`, category: "content", site: "retail" },
  { key: "retail_cart", label: "Cart", url: `${SITE_URLS.retail}/cart`, category: "forms", site: "retail" },
  { key: "wholesale_home", label: "Wholesale Homepage", url: SITE_URLS.wholesale, category: "navigation", site: "wholesale" },
];

export const MOBILE_VIEWPORT = { width: 390, height: 844 };
export const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
