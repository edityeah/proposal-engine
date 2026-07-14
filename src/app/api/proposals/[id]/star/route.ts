import { auth } from "@/lib/auth";
import { setProposalStar } from "@/lib/db/queries";

export const runtime = "nodejs";

// Toggle a document's star (a filter, not a folder — see My Docs).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { starred?: boolean };
  const ok = await setProposalStar(id, !!b.starred);
  return ok ? Response.json({ ok: true, starred: !!b.starred }) : Response.json({ error: "Not found" }, { status: 404 });
}
