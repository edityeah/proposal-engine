import { requireAdmin } from "@/lib/admin";
import { updateCuration, archiveCuration } from "@/lib/db/curation";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await updateCuration(
    id,
    {
      title: b.title !== undefined ? String(b.title) : undefined,
      content: b.content !== undefined ? String(b.content) : undefined,
      kind: b.kind !== undefined ? String(b.kind) : undefined,
      tags: Array.isArray(b.tags) ? (b.tags as string[]) : undefined,
      docTypes: Array.isArray(b.docTypes) ? (b.docTypes as string[]) : undefined,
      products: Array.isArray(b.products) ? (b.products as string[]) : undefined,
      state: b.state !== undefined ? (b.state ? String(b.state) : null) : undefined,
      enabled: b.enabled !== undefined ? (b.enabled ? 1 : 0) : undefined,
    },
    a.session.user.id,
  );
  return Response.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const { id } = await params;
  await archiveCuration(id);
  return Response.json({ ok: true });
}
