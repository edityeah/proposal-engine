import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: (session.user as { role?: string }).role ?? "operator",
        state: (session.user as { state?: string | null }).state ?? null,
      }}
    />
  );
}
