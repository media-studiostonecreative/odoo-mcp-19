import { NextRequest, NextResponse } from "next/server";
import { countActiveAdmins, listPeople, resetCode, revokePerson } from "@/lib/team/people";
import { currentPerson, forbidden, unauthorized } from "@/lib/team/session";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const person = await currentPerson();
  if (!person) return unauthorized();
  if (person.role !== "admin") return forbidden();
  const { id } = await context.params;
  const targetId = Number(id);
  const target = listPeople().find((p) => p.id === targetId);
  if (!target || target.revoked_at) return NextResponse.json({ error: "That person doesn't have active access." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { action?: unknown } | null;
  if (body?.action === "reset") {
    return NextResponse.json({ code: resetCode(targetId) });
  }
  if (body?.action === "revoke") {
    if (target.role === "admin" && countActiveAdmins() <= 1) {
      return NextResponse.json({ error: "Add another admin before removing the last one, or nobody could manage the team." }, { status: 400 });
    }
    revokePerson(targetId);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'action must be "reset" or "revoke".' }, { status: 400 });
}
