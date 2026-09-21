// dashboard/src/lib/marketing/emailCampaigns.ts
import "server-only";

import { getHealthDb } from "../db";

export interface EmailCampaign {
  id: number;
  sent_date: string;
  subject: string;
  recipients: number;
  opens: number;
  clicks: number;
  revenue: number;
  notes: string | null;
  created_at: string;
}

export interface NewEmailCampaign {
  sent_date: string;
  subject: string;
  recipients: number;
  opens: number;
  clicks: number;
  revenue: number;
  notes?: string | null;
}

export function listEmailCampaigns(): EmailCampaign[] {
  const db = getHealthDb();
  return db.prepare("SELECT * FROM email_campaigns ORDER BY sent_date DESC, id DESC").all() as EmailCampaign[];
}

export function createEmailCampaign(data: NewEmailCampaign): EmailCampaign {
  const db = getHealthDb();
  const result = db
    .prepare(
      `INSERT INTO email_campaigns (sent_date, subject, recipients, opens, clicks, revenue, notes)
       VALUES (@sent_date, @subject, @recipients, @opens, @clicks, @revenue, @notes)`,
    )
    .run({ ...data, notes: data.notes ?? null });
  return db.prepare("SELECT * FROM email_campaigns WHERE id = ?").get(result.lastInsertRowid) as EmailCampaign;
}

export function deleteEmailCampaign(id: number): boolean {
  const db = getHealthDb();
  const result = db.prepare("DELETE FROM email_campaigns WHERE id = ?").run(id);
  return result.changes > 0;
}
