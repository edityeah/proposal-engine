import { auth } from "@/lib/auth";
import { getThread, getMessages, deleteThread, renameThread } from "@/lib/db/chat";

export const runtime = "nodejs";

// Rename a chat (editable title in the chat top bar).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const title = (body.title || "").trim().slice(0, 80);
  if (!title) return Response.json({ error: "Title required" }, { status: 400 });
  await renameThread(id, session.user.id, title);
  return Response.json({ ok: true, title });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const thread = await getThread(id, session.user.id);
  if (!thread) return Response.json({ error: "Not found" }, { status: 404 });
  const messages = await getMessages(id);
  return Response.json({ thread, messages });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  await deleteThread(id, session.user.id);
  return Response.json({ ok: true });
}
