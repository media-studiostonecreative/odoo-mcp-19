import { NextResponse } from "next/server";
import { listAudits } from "@/lib/server/health/auditImport";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const audits = listAudits();
    return NextResponse.json({ audits });
  } catch (error) {
    console.error("[website-health] failed to list audits:", error);
    return NextResponse.json({ error: "Unable to load audit history." }, { status: 500 });
  }
}
