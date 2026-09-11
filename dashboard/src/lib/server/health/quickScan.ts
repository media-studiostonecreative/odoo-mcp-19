import "server-only";

import { chromium, type Browser, type ConsoleMessage, type Request } from "playwright";
import { createHash } from "node:crypto";
import { getHealthDb } from "./db";
import { DEFAULT_QUICK_SCAN_PAGES, MOBILE_VIEWPORT, DESKTOP_VIEWPORT, SITE_URLS } from "./config";

/**
 * Live, on-demand Playwright checks — separate from the existing
 * Claude-CLI-driven monthly Full Audit. Read-only: navigates and inspects,
 * never fills in or submits forms, never adds to cart for real.
 */

const MAX_LINKS_TO_CHECK = 30;
const NAV_TIMEOUT_MS = 15_000;

interface CheckResult {
  check_type: string;
  category: string;
  page: string | null;
  label: string;
  status: "pass" | "fail" | "warn";
  details?: Record<string, unknown>;
}

function fingerprint(category: string, page: string | null, label: string): string {
  return createHash("sha1").update(`scan|${category}|${page ?? ""}|${label}`).digest("hex").slice(0, 16);
}

export function startQuickScan(): number {
  const db = getHealthDb();
  const totalChecks = DEFAULT_QUICK_SCAN_PAGES.length + 1; // +1 for the link crawl pass
  const result = db
    .prepare(
      `INSERT INTO scans (scan_type, status, total_checks) VALUES ('quick', 'running', ?)`,
    )
    .run(totalChecks);
  const scanId = result.lastInsertRowid as number;

  // Fire-and-forget: the API route returns immediately, the UI polls for progress.
  runQuickScan(scanId).catch((err) => {
    const database = getHealthDb();
    database
      .prepare(`UPDATE scans SET status = 'failed', error = ?, finished_at = datetime('now') WHERE id = ?`)
      .run(String(err instanceof Error ? err.message : err), scanId);
  });

  return scanId;
}

async function runQuickScan(scanId: number): Promise<void> {
  const db = getHealthDb();
  let browser: Browser | null = null;
  let passed = 0;
  let failed = 0;
  let warned = 0;

  const recordCheck = (result: CheckResult) => {
    db.prepare(
      `INSERT INTO checks (scan_id, check_type, category, page, label, status, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(scanId, result.check_type, result.category, result.page, result.label, result.status, JSON.stringify(result.details ?? {}));
    if (result.status === "pass") passed++;
    else if (result.status === "warn") warned++;
    else failed++;
  };

  const tick = (label: string) => {
    db.prepare(
      `UPDATE scans SET completed_checks = completed_checks + 1, current_label = ?, passed_checks = ?, failed_checks = ?, warned_checks = ? WHERE id = ?`,
    ).run(label, passed, failed, warned, scanId);
  };

  try {
    browser = await chromium.launch({ headless: true });

    for (const target of DEFAULT_QUICK_SCAN_PAGES) {
      await checkPage(browser, target, recordCheck);
      tick(target.label);
    }

    const homepageLinks = await collectInternalLinks(browser, SITE_URLS.retail);
    await checkLinks(browser, homepageLinks, recordCheck);
    tick("Broken link scan");

    db.prepare(
      `UPDATE scans SET status = 'completed', finished_at = datetime('now'), passed_checks = ?, failed_checks = ?, warned_checks = ? WHERE id = ?`,
    ).run(passed, failed, warned, scanId);

    generateIssuesFromScan(scanId);
  } finally {
    await browser?.close();
  }
}

async function checkPage(
  browser: Browser,
  target: { key: string; label: string; url: string; category: string },
  recordCheck: (r: CheckResult) => void,
): Promise<void> {
  const context = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on("requestfailed", (req: Request) => {
    failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText ?? "failed"}`);
  });

  try {
    const response = await page.goto(target.url, { timeout: NAV_TIMEOUT_MS, waitUntil: "domcontentloaded" });
    const status = response?.status() ?? 0;
    recordCheck({
      check_type: "availability",
      category: "technical",
      page: target.url,
      label: `${target.label} reachable`,
      status: status >= 200 && status < 400 ? "pass" : "fail",
      details: { httpStatus: status },
    });

    const title = await page.title();
    recordCheck({
      check_type: "content",
      category: "content",
      page: target.url,
      label: `${target.label} has a page title`,
      status: title && title.trim().length > 0 ? "pass" : "warn",
      details: { title },
    });

    await page.waitForTimeout(1500); // let async console/network activity settle

    recordCheck({
      check_type: "console_error",
      category: "technical",
      page: target.url,
      label: `${target.label} — JavaScript console errors`,
      status: consoleErrors.length === 0 ? "pass" : "warn",
      details: { count: consoleErrors.length, samples: consoleErrors.slice(0, 5) },
    });

    recordCheck({
      check_type: "network_error",
      category: "technical",
      page: target.url,
      label: `${target.label} — failed network requests`,
      status: failedRequests.length === 0 ? "pass" : "warn",
      details: { count: failedRequests.length, samples: failedRequests.slice(0, 5) },
    });

    if (target.category === "forms") {
      const formCount = await page.locator("form").count();
      recordCheck({
        check_type: "form",
        category: "forms",
        page: target.url,
        label: `${target.label} — form present`,
        status: formCount > 0 ? "pass" : "warn",
        details: { formCount },
      });
    }

    // Mobile overflow check, reusing the same page in a resized context.
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - window.innerWidth;
    });
    recordCheck({
      check_type: "mobile_layout",
      category: "ux",
      page: target.url,
      label: `${target.label} — mobile (390px) horizontal overflow`,
      status: overflow > 20 ? "fail" : "pass",
      details: { overflowPx: overflow },
    });
  } catch (err) {
    recordCheck({
      check_type: "availability",
      category: "technical",
      page: target.url,
      label: `${target.label} reachable`,
      status: "fail",
      details: { error: err instanceof Error ? err.message : String(err) },
    });
  } finally {
    await context.close();
  }
}

async function collectInternalLinks(browser: Browser, homepageUrl: string): Promise<string[]> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(homepageUrl, { timeout: NAV_TIMEOUT_MS, waitUntil: "domcontentloaded" });
    const hrefs = await page.$$eval("a[href]", (els) => els.map((el) => el.getAttribute("href") ?? ""));
    const origin = new URL(homepageUrl).origin;
    const resolved = hrefs
      .filter((h) => h && !h.startsWith("mailto:") && !h.startsWith("tel:") && !h.startsWith("#"))
      .map((h) => {
        try {
          return new URL(h, homepageUrl).toString();
        } catch {
          return null;
        }
      })
      .filter((u): u is string => Boolean(u) && u!.startsWith(origin));
    return [...new Set(resolved)].slice(0, MAX_LINKS_TO_CHECK);
  } finally {
    await context.close();
  }
}

async function checkLinks(
  browser: Browser,
  links: string[],
  recordCheck: (r: CheckResult) => void,
): Promise<void> {
  const context = await browser.newContext();
  try {
    for (const link of links) {
      try {
        const response = await context.request.get(link, {
          timeout: 10_000,
          maxRedirects: 0,
          failOnStatusCode: false,
        });
        const status = response.status();
        const kind = status >= 400 ? "fail" : status >= 300 ? "warn" : "pass";
        recordCheck({
          check_type: "link",
          category: "navigation",
          page: link,
          label: `Internal link — ${new URL(link).pathname}`,
          status: kind,
          details: { destination: link, httpStatus: status },
        });
      } catch (err) {
        recordCheck({
          check_type: "link",
          category: "navigation",
          page: link,
          label: `Internal link — ${(() => {
            try {
              return new URL(link).pathname;
            } catch {
              return link;
            }
          })()}`,
          status: "fail",
          details: { destination: link, error: err instanceof Error ? err.message : String(err) },
        });
      }
    }
  } finally {
    await context.close();
  }
}

/** Roll failing/warning checks from one scan into deduped, tracked issues + alerts. */
function generateIssuesFromScan(scanId: number): void {
  const db = getHealthDb();
  const problemChecks = db
    .prepare(`SELECT * FROM checks WHERE scan_id = ? AND status != 'pass'`)
    .all(scanId) as Array<{
    id: number;
    check_type: string;
    category: string;
    page: string | null;
    label: string;
    status: "fail" | "warn";
    details: string;
  }>;

  const upsertIssue = db.prepare(`
    INSERT INTO issues (fingerprint, severity, category, page, title, description, evidence, source, last_detected, frequency)
    VALUES (@fingerprint, @severity, @category, @page, @title, @description, @evidence, 'quick_scan', datetime('now'), 1)
    ON CONFLICT(fingerprint) DO UPDATE SET
      last_detected = datetime('now'),
      frequency = frequency + 1,
      current_value = excluded.description,
      status = CASE WHEN issues.status = 'resolved' THEN 'open' ELSE issues.status END
  `);

  const insertAlertIfMissing = db.prepare(`
    INSERT OR IGNORE INTO alerts (issue_id, status) SELECT id, 'open' FROM issues WHERE fingerprint = ?
  `);

  for (const check of problemChecks) {
    const fp = fingerprint(check.category, check.page, check.label);
    const severity = check.status === "fail" ? "critical" : "warning";
    upsertIssue.run({
      fingerprint: fp,
      severity,
      category: check.category,
      page: check.page,
      title: check.label,
      description: check.details,
      evidence: check.details,
    });
    insertAlertIfMissing.run(fp);
  }

  // Auto-resolve open issues from previous quick scans that this scan re-checked and found clean.
  const cleanChecks = db
    .prepare(`SELECT * FROM checks WHERE scan_id = ? AND status = 'pass'`)
    .all(scanId) as Array<{ category: string; page: string | null; label: string }>;
  const resolveIssue = db.prepare(
    `UPDATE issues SET status = 'resolved' WHERE fingerprint = ? AND status != 'resolved' AND source = 'quick_scan'`,
  );
  for (const check of cleanChecks) {
    resolveIssue.run(fingerprint(check.category, check.page, check.label));
  }
}

export interface ScanStatus {
  id: number;
  scan_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  total_checks: number;
  completed_checks: number;
  passed_checks: number;
  failed_checks: number;
  warned_checks: number;
  current_label: string | null;
  error: string | null;
}

export function getScanStatus(id: number): ScanStatus | null {
  const db = getHealthDb();
  return (db.prepare("SELECT * FROM scans WHERE id = ?").get(id) as ScanStatus | undefined) ?? null;
}

export function getScanChecks(id: number) {
  const db = getHealthDb();
  return db.prepare("SELECT * FROM checks WHERE scan_id = ? ORDER BY id ASC").all(id);
}

export function getLatestScan(scanType: "quick" | "full" = "quick"): ScanStatus | null {
  const db = getHealthDb();
  return (
    (db
      .prepare("SELECT * FROM scans WHERE scan_type = ? ORDER BY started_at DESC LIMIT 1")
      .get(scanType) as ScanStatus | undefined) ?? null
  );
}

export interface LinkCheckRow {
  page: string | null;
  label: string;
  status: "pass" | "fail" | "warn";
  details: string;
  created_at: string;
  scan_id: number;
}

/** Most recent result per link, from the latest completed quick scan that included a link pass. */
export function getLatestLinkChecks(): LinkCheckRow[] {
  const db = getHealthDb();
  const latestScan = db
    .prepare(
      `SELECT scan_id FROM checks WHERE check_type = 'link' ORDER BY scan_id DESC LIMIT 1`,
    )
    .get() as { scan_id: number } | undefined;
  if (!latestScan) return [];
  return db
    .prepare(
      `SELECT page, label, status, details, created_at, scan_id FROM checks WHERE scan_id = ? AND check_type = 'link' ORDER BY status DESC, label ASC`,
    )
    .all(latestScan.scan_id) as LinkCheckRow[];
}
