import "server-only";

import { createHash } from "node:crypto";
import { getHealthDb } from "../db";
import type { SaleOrderWithState } from "./quotations";

/**
 * Wholesale (Odoo) equivalent of an "abandoned cart" alert. Odoo has no
 * shopping cart, so the closest real signals from sale.order are:
 *   - "not sent": a quotation still in draft — created but never sent.
 *   - "abandoned": a quotation sent to the customer that has sat with no reply.
 * Thresholds are day-count, not fabricated — computed straight off date_order.
 */

const NOT_SENT_WARNING_DAYS = 3;
const NOT_SENT_CRITICAL_DAYS = 10;
const ABANDONED_WARNING_DAYS = 14;
const ABANDONED_CRITICAL_DAYS = 30;

function ageDays(dateOrder: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(dateOrder).getTime()) / 86_400_000);
}

function fingerprintOrder(kind: "not_sent" | "abandoned", name: string): string {
  return createHash("sha1").update(`odoo-order-alert|${kind}|${name}`).digest("hex").slice(0, 16);
}

/**
 * Upserts an issue per stale quotation and auto-resolves ones that moved on
 * (sent, confirmed, or cancelled since the last check). Called as a side
 * effect of loading Odoo business data — same pattern as quickScan's
 * generateIssuesFromScan and auditImport's issue sync.
 *
 * IMPORTANT: `openQuotations` must be the complete current set (e.g. the
 * full, unfiltered result of `fetchOpenQuotations()`), not a filtered or
 * paginated subset — auto-resolve treats "fingerprint not present in this
 * call's list" as "no longer stale," so a partial list would incorrectly
 * resolve still-stale orders that simply weren't included in the call.
 */
export function generateOdooOrderAlerts(openQuotations: SaleOrderWithState[], now: Date = new Date()): void {
  const db = getHealthDb();

  const upsertIssue = db.prepare(`
    INSERT INTO issues (fingerprint, severity, category, site, page, title, description, evidence, source, last_detected, frequency)
    VALUES (@fingerprint, @severity, 'business', 'wholesale', @page, @title, @description, @evidence, 'odoo_order_alert', datetime('now'), 1)
    ON CONFLICT(fingerprint) DO UPDATE SET
      last_detected = datetime('now'),
      frequency = frequency + 1,
      severity = excluded.severity,
      current_value = excluded.description,
      status = CASE WHEN issues.status = 'resolved' THEN 'open' ELSE issues.status END
  `);

  const activeFingerprints: string[] = [];

  for (const q of openQuotations) {
    const partnerName = q.partner_id ? q.partner_id[1] : "Unknown customer";
    const days = ageDays(q.date_order, now);

    if (q.state === "draft" && days >= NOT_SENT_WARNING_DAYS) {
      const fp = fingerprintOrder("not_sent", q.name);
      activeFingerprints.push(fp);
      upsertIssue.run({
        fingerprint: fp,
        severity: days >= NOT_SENT_CRITICAL_DAYS ? "critical" : "warning",
        page: "Odoo",
        title: `Wholesale quotation not sent — ${q.name} (${partnerName})`,
        description: `Created ${days} day${days === 1 ? "" : "s"} ago and still sitting in Draft — never sent to the customer.`,
        evidence: JSON.stringify({ orderId: q.id, name: q.name, partner: partnerName, ageDays: days, amount: q.amount_total }),
      });
    } else if (q.state === "sent" && days >= ABANDONED_WARNING_DAYS) {
      const fp = fingerprintOrder("abandoned", q.name);
      activeFingerprints.push(fp);
      upsertIssue.run({
        fingerprint: fp,
        severity: days >= ABANDONED_CRITICAL_DAYS ? "critical" : "warning",
        page: "Odoo",
        title: `Wholesale quotation abandoned — ${q.name} (${partnerName})`,
        description: `Sent to the customer ${days} days ago with no confirmation or response yet.`,
        evidence: JSON.stringify({ orderId: q.id, name: q.name, partner: partnerName, ageDays: days, amount: q.amount_total }),
      });
    }
  }

  const openAlerts = db
    .prepare(`SELECT fingerprint FROM issues WHERE source = 'odoo_order_alert' AND status != 'resolved'`)
    .all() as { fingerprint: string }[];
  const resolveIssue = db.prepare(`UPDATE issues SET status = 'resolved' WHERE fingerprint = ?`);
  for (const { fingerprint } of openAlerts) {
    if (!activeFingerprints.includes(fingerprint)) resolveIssue.run(fingerprint);
  }
}
