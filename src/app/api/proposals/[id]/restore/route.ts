import { auth } from "@/lib/auth";
import { getVersion, addVersion } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { version?: number };
  if (!body.version) return Response.json({ error: "version required" }, { status: 400 });

  const v = await getVersion(id, body.version);
  if (!v) return Response.json({ error: "Version not found" }, { status: 404 });

  const newVersion = await addVersion(id, v.content, `Restore of v${body.version}`);
  return Response.json({ ok: true, version: newVersion, content: v.content });
}
