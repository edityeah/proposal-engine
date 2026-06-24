import { requireAdmin } from "@/lib/admin";
import { listUsers, setUserRoleState } from "@/lib/db/users";

export const runtime = "nodejs";

export async function GET() {
  const a = await requireAdmin();
  if (a.error) return a.error;
  return Response.json({ users: await listUsers() });
}

export async function PATCH(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const b = (await req.json().catch(() => ({}))) as { id?: string; role?: string; state?: string | null };
  if (!b.id) return Response.json({ error: "id required" }, { status: 400 });
  await setUserRoleState(b.id, b.role, b.state);
  return Response.json({ ok: true });
}
