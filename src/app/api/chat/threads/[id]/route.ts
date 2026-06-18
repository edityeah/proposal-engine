import { auth } from "@/lib/auth";
import { getThread, getMessages, deleteThread } from "@/lib/db/chat";

export const runtime = "nodejs";

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
