import { NextRequest, NextResponse } from "next/server";
import { deleteEmailCampaign } from "@/lib/marketing/emailCampaigns";

export const dynamic = "force-dynamic";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const deleted = deleteEmailCampaign(Number(id));
  if (!deleted) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
