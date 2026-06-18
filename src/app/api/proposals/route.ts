import { auth } from "@/lib/auth";
import { listProposals, historyMetrics } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const [proposals, metrics] = await Promise.all([
    listProposals(),
    historyMetrics(),
  ]);
  return Response.json({ proposals, metrics });
}
