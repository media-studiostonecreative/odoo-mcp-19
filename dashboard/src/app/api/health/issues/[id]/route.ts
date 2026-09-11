import { NextRequest, NextResponse } from "next/server";
import { getIssue, applyAlertAction, getAlertHistory, type AlertAction } from "@/lib/server/health/issues";

export const dynamic = "force-dynamic";

const VALID_ACTIONS: AlertAction[] = ["acknowledge", "snooze_1d", "snooze_7d", "resolve", "reopen"];

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const issueId = Number(id);
  const issue = getIssue(issueId);
  if (!issue) return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  const history = getAlertHistory(issueId);
  return NextResponse.json({ issue, history });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const issueId = Number(id);
  const body = (await request.json().catch(() => ({}))) as { action?: string; note?: string };
  if (!body.action || !VALID_ACTIONS.includes(body.action as AlertAction)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }
  const updated = applyAlertAction(issueId, body.action as AlertAction, body.note);
  if (!updated) return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  return NextResponse.json({ issue: updated });
}
