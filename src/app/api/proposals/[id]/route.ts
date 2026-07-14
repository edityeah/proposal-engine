import { auth } from "@/lib/auth";
import { getProposal, getVersions, setOutcome, addVersion } from "@/lib/db/queries";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set(["draft", "in_review", "won", "lost"]);
const MAX_DOC = 500_000; // guardrail on saved document size

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
  const body = (await req.json().catch(() => ({}))) as { status?: string; reason?: string };
  if (!body.status || !ALLOWED_STATUS.has(body.status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }
  // A reason is mandatory for every outcome change.
  const reason = (body.reason ?? "").trim();
  if (!reason) {
    return Response.json({ error: "A reason is required" }, { status: 400 });
  }
  await setOutcome(id, body.status, reason);
  return Response.json({ ok: true });
}

// Save a manual (Google-Docs-style) edit: persists the edited document as a new
// version and updates the current output (reuses addVersion — no schema change).
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { content?: string; label?: string };
  if (typeof body.content !== "string" || !body.content.trim()) {
    return Response.json({ error: "content required" }, { status: 400 });
  }
  if (body.content.length > MAX_DOC) {
    return Response.json({ error: "Document too large" }, { status: 413 });
  }
  const existing = await getProposal(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const version = await addVersion(id, body.content, (body.label || "Manual edit").slice(0, 120));
  return Response.json({ ok: true, version, content: body.content });
}
