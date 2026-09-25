import { NextRequest, NextResponse } from "next/server";
import { listUpcomingTradeShows, createTradeShow, tradeShowPostByDate, type NewTradeShow } from "@/lib/social/tradeShows";
import { logActivity } from "@/lib/team/activity";
import { currentPerson, unauthorized } from "@/lib/team/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tradeShows = listUpcomingTradeShows().map((show) => ({ ...show, post_by_date: tradeShowPostByDate(show) }));
    return NextResponse.json({ tradeShows });
  } catch (error) {
    console.error("[social-dashboard] failed to list trade shows:", error);
    return NextResponse.json({ error: "Unable to load trade shows." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const person = await currentPerson();
  if (!person) return unauthorized();
  const body = (await request.json().catch(() => null)) as Partial<NewTradeShow> | null;
  if (!body || !body.name || !body.start_date) {
    return NextResponse.json({ error: "name and start_date are required." }, { status: 400 });
  }
  try {
    const tradeShow = createTradeShow({
      name: body.name,
      location: body.location ?? null,
      start_date: body.start_date,
      end_date: body.end_date ?? null,
      lead_days: body.lead_days,
      notes: body.notes ?? null,
    });
    logActivity(person, "trade_show", tradeShow.id, "create", `Added event "${tradeShow.name}"`);
    return NextResponse.json({ tradeShow }, { status: 201 });
  } catch (error) {
    console.error("[social-dashboard] failed to create trade show:", error);
    return NextResponse.json({ error: "Unable to save trade show." }, { status: 500 });
  }
}
