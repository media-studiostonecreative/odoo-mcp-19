import { NextResponse } from "next/server";
import { listUpcomingOccasions } from "@/lib/social/seasonalCalendar";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ occasions: listUpcomingOccasions() });
}
