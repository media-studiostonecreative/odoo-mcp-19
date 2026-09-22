import { NextResponse } from "next/server";
import { listAudits } from "@/lib/issues/auditImport";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ audits: listAudits() });
  } catch (error) {
    console.error("[website-health] failed to list audits:", error);
    return NextResponse.json({ error: "Unable to load audit history." }, { status: 500 });
  }
}
