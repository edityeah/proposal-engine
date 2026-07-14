import { requireAdmin } from "@/lib/admin";
import { seedPabCuration } from "@/lib/db/curation";

export const runtime = "nodejs";

// One-click: insert the fixed PAB-guidance curation set (idempotent).
export async function POST() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const created = await seedPabCuration(a.session.user.id);
  return Response.json({ ok: true, created });
}
