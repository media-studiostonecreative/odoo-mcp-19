import { NextRequest, NextResponse } from "next/server";
import { listEmailCampaigns, createEmailCampaign, type NewEmailCampaign } from "@/lib/marketing/emailCampaigns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ campaigns: listEmailCampaigns() });
  } catch (error) {
    console.error("[website-health] failed to list email campaigns:", error);
    return NextResponse.json({ error: "Unable to load email campaigns." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Partial<NewEmailCampaign> | null;
  if (!body || !body.sent_date || !body.subject) {
    return NextResponse.json({ error: "sent_date and subject are required." }, { status: 400 });
  }
  try {
    const campaign = createEmailCampaign({
      sent_date: body.sent_date,
      subject: body.subject,
      recipients: Number(body.recipients) || 0,
      opens: Number(body.opens) || 0,
      clicks: Number(body.clicks) || 0,
      revenue: Number(body.revenue) || 0,
      notes: body.notes ?? null,
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("[website-health] failed to create email campaign:", error);
    return NextResponse.json({ error: "Unable to save email campaign." }, { status: 500 });
  }
}
