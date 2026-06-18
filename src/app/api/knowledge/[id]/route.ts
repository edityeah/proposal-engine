import { auth } from "@/lib/auth";
import { archiveKnowledge } from "@/lib/db/knowledge";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  await archiveKnowledge(id);
  return Response.json({ ok: true });
}
