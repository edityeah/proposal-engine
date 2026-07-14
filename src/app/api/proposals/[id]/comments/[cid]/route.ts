import { auth } from "@/lib/auth";
import { updateProposalComment, deleteProposalComment } from "@/lib/db/queries";

export const runtime = "nodejs";

// Resolve / re-open a comment (or edit its body).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id, cid } = await params;
  const b = (await req.json().catch(() => ({}))) as { resolved?: boolean; body?: string };
  const patch: { resolved?: boolean; body?: string } = {};
  if (typeof b.resolved === "boolean") patch.resolved = b.resolved;
  if (typeof b.body === "string" && b.body.trim()) patch.body = b.body.trim().slice(0, 4000);
  const ok = await updateProposalComment(id, cid, patch);
  return ok ? Response.json({ ok: true }) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id, cid } = await params;
  const ok = await deleteProposalComment(id, cid);
  return ok ? Response.json({ ok: true }) : Response.json({ error: "Not found" }, { status: 404 });
}
