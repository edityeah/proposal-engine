import { requireAdmin } from "@/lib/admin";
import { listCuration, createCuration } from "@/lib/db/curation";

export const runtime = "nodejs";

const KINDS = new Set(["best_practice", "proof_point", "boilerplate"]);

export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  return Response.json({ entries: await listCuration() });
}

export async function POST(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!KINDS.has(String(b.kind))) return Response.json({ error: "Invalid kind" }, { status: 400 });
  if (!String(b.title || "").trim() || !String(b.content || "").trim()) {
    return Response.json({ error: "Title and content are required" }, { status: 400 });
  }
  const row = await createCuration({
    kind: String(b.kind),
    title: String(b.title).trim(),
    content: String(b.content).trim(),
    tags: Array.isArray(b.tags) ? (b.tags as string[]) : [],
    docTypes: Array.isArray(b.docTypes) ? (b.docTypes as string[]) : [],
    products: Array.isArray(b.products) ? (b.products as string[]) : [],
    state: b.state ? String(b.state) : null,
    updatedBy: a.session.user.id,
  });
  return Response.json({ entry: row });
}
