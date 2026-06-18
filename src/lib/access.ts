// Pure org-domain gate. Kept separate from auth.ts so it can be unit-tested
// without importing the DB-backed NextAuth config.
export function isAllowedEmail(email: string | null | undefined, domain: string): boolean {
  if (!email) return false;
  return email.toLowerCase().trim().endsWith("@" + domain.toLowerCase());
}

// Admin allowlist. Defaults to the two seeded admins; override/extend via the
// ALLOWED_ADMIN_EMAILS env var (comma-separated). Everyone else is a member.
const DEFAULT_ADMINS = ["devasheesh@convegenius.ai", "aditya.c@convegenius.ai"];

export function adminEmails(): string[] {
  const env = process.env.ALLOWED_ADMIN_EMAILS;
  const list = env ? env.split(",") : DEFAULT_ADMINS;
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase().trim());
}

export type Role = "admin" | "member";
export function roleFor(email: string | null | undefined): Role {
  return isAdminEmail(email) ? "admin" : "member";
}
