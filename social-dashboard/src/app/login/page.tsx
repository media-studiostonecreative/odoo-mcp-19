import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { currentPerson } from "@/lib/team/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentPerson()) redirect("/");
  const { next } = await searchParams;
  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
      <LoginForm next={next ?? null} />
    </div>
  );
}
