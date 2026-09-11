import { NextResponse } from "next/server";
import { getAuditDetail } from "@/lib/server/health/auditImport";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auditId = Number(id);
  if (!Number.isInteger(auditId)) {
    return NextResponse.json({ error: "Invalid audit id." }, { status: 400 });
  }
  const detail = getAuditDetail(auditId);
  if (!detail) return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  return NextResponse.json(detail);
}
