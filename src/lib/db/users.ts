import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";
import { isAdminEmail } from "@/lib/access";

export async function listUsers() {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, state: users.state })
    .from(users)
    .orderBy(asc(users.email));
  // Bootstrap-allowlist admins always show as admin regardless of stored role.
  return rows.map((u) => ({ ...u, role: isAdminEmail(u.email) ? "admin" : u.role, locked: isAdminEmail(u.email) }));
}

// Lightweight org directory for the comment "For:" picker — any signed-in user
// may read it (unlike listUsers, which is admin-only via /api/admin/users).
export async function listDirectory() {
  return db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(users)
    .orderBy(asc(users.email));
}

export async function setUserRoleState(id: string, role: string | undefined, state: string | null | undefined) {
  const patch: Record<string, unknown> = {};
  if (role === "admin" || role === "operator") patch.role = role;
  if (state !== undefined) patch.state = state || null;
  if (Object.keys(patch).length === 0) return;
  await db.update(users).set(patch).where(eq(users.id, id));
}
