import { NextRequest, NextResponse } from "next/server";
import { deleteTradeShow, updateTradeShow, type TradeShowUpdate } from "@/lib/social/tradeShows";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as TradeShowUpdate;
  const tradeShow = updateTradeShow(Number(id), body);
  if (!tradeShow) return NextResponse.json({ error: "Trade show not found." }, { status: 404 });
  return NextResponse.json({ tradeShow });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deleted = deleteTradeShow(Number(id));
  if (!deleted) return NextResponse.json({ error: "Trade show not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
