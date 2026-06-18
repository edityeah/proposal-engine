import { auth } from "@/lib/auth";
import { listThreads } from "@/lib/db/chat";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  return Response.json({ threads: await listThreads(session.user.id) });
}
