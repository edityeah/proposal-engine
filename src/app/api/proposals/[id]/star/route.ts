import { auth } from "@/lib/auth";
import { getProposal, setProposalStar, canAccessProposal, scopeFromSession } from "@/lib/db/queries";

export const runtime = "nodejs";

// Toggle a document's star (a filter, not a folder — see My Docs).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canAccessProposal(proposal, scopeFromSession(session.user as { role?: string; state?: string | null }))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const b = (await req.json().catch(() => ({}))) as { starred?: boolean };
  const ok = await setProposalStar(id, !!b.starred);
  return ok ? Response.json({ ok: true, starred: !!b.starred }) : Response.json({ error: "Not found" }, { status: 404 });
}
