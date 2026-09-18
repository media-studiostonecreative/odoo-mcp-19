import { NextResponse } from "next/server";
import { getScanStatus } from "@/lib/issues/quickScan";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const scanId = Number(id);
  if (!Number.isInteger(scanId)) return NextResponse.json({ error: "Invalid scan id." }, { status: 400 });
  const scan = getScanStatus(scanId);
  if (!scan) return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  return NextResponse.json({ scan });
}
