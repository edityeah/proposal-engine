// Pure org-domain gate. Kept separate from auth.ts so it can be unit-tested
// without importing the DB-backed NextAuth config.
export function isAllowedEmail(email: string | null | undefined, domain: string): boolean {
  if (!email) return false;
  return email.toLowerCase().trim().endsWith("@" + domain.toLowerCase());
}
