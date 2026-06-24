import { auth } from "@/lib/auth";
import { analytics } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const u = session.user as { role?: string; state?: string | null };
  return Response.json(await analytics({ role: u.role ?? "operator", state: u.state ?? null }));
}
