import { NextRequest, NextResponse } from "next/server";
import { createPerson, listPeople, type PersonRole } from "@/lib/team/people";
import { currentPerson, forbidden, unauthorized } from "@/lib/team/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const person = await currentPerson();
  if (!person) return unauthorized();
  if (person.role !== "admin") return forbidden();
  return NextResponse.json({ people: listPeople() });
}

export async function POST(request: NextRequest) {
  const person = await currentPerson();
  if (!person) return unauthorized();
  if (person.role !== "admin") return forbidden();
  const body = (await request.json().catch(() => null)) as { name?: unknown; role?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Enter the person's name." }, { status: 400 });
  if (name.length > 80) return NextResponse.json({ error: "Keep names under 80 characters." }, { status: 400 });
  const role: PersonRole = body?.role === "admin" ? "admin" : "member";
  const { person: created, code } = createPerson(name, role);
  return NextResponse.json({ person: created, code }, { status: 201 });
}
