import { auth } from "@/lib/auth";
import { getProposal, getVersions, setStatus } from "@/lib/db/queries";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set(["draft", "in_review", "won", "lost"]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) return Response.json({ error: "Not found" }, { status: 404 });
  const versions = await getVersions(id);
  return Response.json({ proposal, versions });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  if (!body.status || !ALLOWED_STATUS.has(body.status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }
  await setStatus(id, body.status);
  return Response.json({ ok: true });
}
