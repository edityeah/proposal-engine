import { auth } from "@/lib/auth";
import {
  getProposal,
  getVersions,
  setOutcome,
  addVersion,
  canAccessProposal,
  scopeFromSession,
} from "@/lib/db/queries";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set(["draft", "in_review", "won", "lost"]);
const MAX_DOC = 500_000; // guardrail on saved document size

type SessionUser = { id: string; role?: string; state?: string | null };

// Loads a proposal and enforces the caller's state scope. Returns the proposal,
// or a Response (404 / 403) the caller should return directly.
async function loadScoped(id: string, user: SessionUser) {
  const proposal = await getProposal(id);
  if (!proposal) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canAccessProposal(proposal, scopeFromSession(user))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return proposal;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const r = await loadScoped(id, session.user as SessionUser);
  if (r instanceof Response) return r;
  const versions = await getVersions(id);
  return Response.json({ proposal: r, versions });
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
  const r = await loadScoped(id, session.user as SessionUser);
  if (r instanceof Response) return r;
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
  const r = await loadScoped(id, session.user as SessionUser);
  if (r instanceof Response) return r;

  const version = await addVersion(id, body.content, (body.label || "Manual edit").slice(0, 120));
  return Response.json({ ok: true, version, content: body.content });
}
