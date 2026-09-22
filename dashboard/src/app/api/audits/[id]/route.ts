import { NextRequest, NextResponse } from "next/server";
import { getAuditDetail } from "@/lib/issues/auditImport";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const audit = getAuditDetail(Number(id));
    if (!audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });
    return NextResponse.json({ audit });
  } catch (error) {
    console.error("[website-health] failed to load audit detail:", error);
    return NextResponse.json({ error: "Unable to load audit detail." }, { status: 500 });
  }
}
