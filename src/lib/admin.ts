import { auth } from "./auth";

// Returns the session if the caller is an admin, otherwise an error Response
// to return directly from the route.
//
// Ground truth is `session.user.role`, which auth.ts already computes as
// admin when the user is either on the bootstrap email allowlist OR has been
// promoted to role='admin' in the DB via the Team Access UI. Keeping both
// checks in one place means admins granted at runtime work everywhere.
export async function requireAdmin(): Promise<
  | { session: { user: { id: string; email?: string | null; role: "admin" } }; error?: never }
  | { session?: never; error: Response }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: Response.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return { error: Response.json({ error: "Admins only" }, { status: 403 }) };
  }
  return {
    session: {
      user: { id: session.user.id, email: session.user.email, role: "admin" },
    },
  };
}
