import { auth } from "@/lib/auth";
import { analytics } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  return Response.json(await analytics());
}
