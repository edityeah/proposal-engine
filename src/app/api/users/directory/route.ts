import { auth } from "@/lib/auth";
import { listDirectory } from "@/lib/db/users";

export const runtime = "nodejs";

// Org directory for the comment "For:" picker — any signed-in user may read it.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  return Response.json({ users: await listDirectory() });
}
