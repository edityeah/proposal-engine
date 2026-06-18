import { auth } from "./auth";
import { isAdminEmail } from "./access";

// Returns the session if the caller is an admin, otherwise an error Response to
// return directly from the route.
export async function requireAdmin(): Promise<
  | { session: { user: { id: string; email?: string | null } }; error?: never }
  | { session?: never; error: Response }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: Response.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  if (!isAdminEmail(session.user.email)) {
    return { error: Response.json({ error: "Admins only" }, { status: 403 }) };
  }
  return { session: { user: { id: session.user.id, email: session.user.email } } };
}
