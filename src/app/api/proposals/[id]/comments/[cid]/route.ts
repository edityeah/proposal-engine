import { auth } from "@/lib/auth";
import {
  getProposal,
  listProposalComments,
  updateProposalComment,
  deleteProposalComment,
  canAccessProposal,
  scopeFromSession,
} from "@/lib/db/queries";

export const runtime = "nodejs";

type SessionUser = { id: string; role?: string; state?: string | null };

// Confirms proposal access and resolves the target comment + whether the caller
// may moderate it (its author, or an admin).
async function resolve(id: string, cid: string, user: SessionUser) {
  const proposal = await getProposal(id);
  if (!proposal) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canAccessProposal(proposal, scopeFromSession(user))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const comment = (await listProposalComments(id)).find((c) => c.id === cid);
  if (!comment) return Response.json({ error: "Not found" }, { status: 404 });
  const canModerate = comment.authorId === user.id || user.role === "admin";
  return { comment, canModerate };
}

// Resolve/re-open a comment (any collaborator with access) or edit its body
// (author or admin only).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id, cid } = await params;
  const r = await resolve(id, cid, session.user as SessionUser);
  if (r instanceof Response) return r;

  const b = (await req.json().catch(() => ({}))) as { resolved?: boolean; body?: string };
  const patch: { resolved?: boolean; body?: string } = {};
  if (typeof b.resolved === "boolean") patch.resolved = b.resolved;
  if (typeof b.body === "string" && b.body.trim()) {
    // Editing the text is restricted to the comment's author (or an admin).
    if (!r.canModerate) return Response.json({ error: "Forbidden" }, { status: 403 });
    patch.body = b.body.trim().slice(0, 4000);
  }
  const ok = await updateProposalComment(id, cid, patch);
  return ok ? Response.json({ ok: true }) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id, cid } = await params;
  const r = await resolve(id, cid, session.user as SessionUser);
  if (r instanceof Response) return r;
  // Only the author (or an admin) may delete a comment.
  if (!r.canModerate) return Response.json({ error: "Forbidden" }, { status: 403 });
  const ok = await deleteProposalComment(id, cid);
  return ok ? Response.json({ ok: true }) : Response.json({ error: "Not found" }, { status: 404 });
}
