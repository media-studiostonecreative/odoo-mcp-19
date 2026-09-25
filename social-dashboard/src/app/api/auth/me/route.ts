import { NextResponse } from "next/server";
import { currentPerson, unauthorized } from "@/lib/team/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const person = await currentPerson();
  if (!person) return unauthorized();
  return NextResponse.json({ person: { id: person.id, name: person.name } });
}
