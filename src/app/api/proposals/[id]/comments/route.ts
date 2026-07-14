import { auth } from "@/lib/auth";
import { listProposalComments, addProposalComment } from "@/lib/db/queries";

export const runtime = "nodejs";

// Comments on a document, visible to anyone who can open it.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  return Response.json({ comments: await listProposalComments(id) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as {
    quote?: string; body?: string; forId?: string | null; forName?: string | null;
  };
  const body = String(b.body || "").trim();
  if (!body) return Response.json({ error: "Comment can't be empty" }, { status: 400 });
  const comment = await addProposalComment(id, {
    authorId: session.user.id,
    authorName: session.user.name || session.user.email || "Someone",
    forId: b.forId ? String(b.forId) : null,
    forName: b.forName ? String(b.forName) : null,
    quote: String(b.quote || "").slice(0, 600),
    body: body.slice(0, 4000),
  });
  if (!comment) return Response.json({ error: "Document not found" }, { status: 404 });
  return Response.json({ comment });
}
