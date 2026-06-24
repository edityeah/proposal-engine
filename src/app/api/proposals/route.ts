import { auth } from "@/lib/auth";
import { listProposals, historyMetrics } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const u = session.user as { role?: string; state?: string | null };
  const scope = { role: u.role ?? "operator", state: u.state ?? null };
  const [proposals, metrics] = await Promise.all([
    listProposals(100, scope),
    historyMetrics(scope),
  ]);
  return Response.json({ proposals, metrics });
}
