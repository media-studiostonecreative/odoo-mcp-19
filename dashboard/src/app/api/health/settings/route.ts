import { NextRequest, NextResponse } from "next/server";
import { listCriticalFacts, updateCriticalFact, listSettings, setSetting } from "@/lib/server/health/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ criticalFacts: listCriticalFacts(), settings: listSettings() });
  } catch (error) {
    console.error("[website-health] failed to load settings:", error);
    return NextResponse.json({ error: "Unable to load settings." }, { status: 500 });
  }
}

interface SettingsPatchBody {
  criticalFact?: { id: number; expectedValue: string; notes?: string };
  setting?: { key: string; value: string };
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as SettingsPatchBody;
  if (body.criticalFact) {
    updateCriticalFact(body.criticalFact.id, body.criticalFact.expectedValue, body.criticalFact.notes);
  }
  if (body.setting) {
    setSetting(body.setting.key, body.setting.value);
  }
  return NextResponse.json({ criticalFacts: listCriticalFacts(), settings: listSettings() });
}
