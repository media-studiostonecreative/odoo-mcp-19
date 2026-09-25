import { NextRequest, NextResponse } from "next/server";
import { deleteTradeShow, listAllTradeShows, updateTradeShow, type TradeShowUpdate } from "@/lib/social/tradeShows";
import { logActivity } from "@/lib/team/activity";
import { currentPerson, unauthorized } from "@/lib/team/session";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const person = await currentPerson();
  if (!person) return unauthorized();
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as TradeShowUpdate;
  const before = listAllTradeShows().find((t) => t.id === Number(id));
  const tradeShow = updateTradeShow(Number(id), body);
  if (!tradeShow || !before) return NextResponse.json({ error: "Trade show not found." }, { status: 404 });
  const notesChanged = body.notes !== undefined && (before.notes ?? null) !== (tradeShow.notes ?? null);
  const otherChanged = (["name", "location", "start_date", "end_date", "lead_days"] as const).some((k) => body[k] !== undefined && before[k] !== tradeShow[k]);
  if (notesChanged) logActivity(person, "trade_show", tradeShow.id, "note", tradeShow.notes ? "Edited the note" : "Removed the note");
  if (otherChanged) logActivity(person, "trade_show", tradeShow.id, "edit", "Edited event details");
  return NextResponse.json({ tradeShow });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const person = await currentPerson();
  if (!person) return unauthorized();
  const { id } = await context.params;
  const before = listAllTradeShows().find((t) => t.id === Number(id));
  const deleted = deleteTradeShow(Number(id));
  if (!deleted) return NextResponse.json({ error: "Trade show not found." }, { status: 404 });
  logActivity(person, "trade_show", Number(id), "delete", `Deleted event "${before?.name ?? "event"}"`);
  return NextResponse.json({ ok: true });
}
