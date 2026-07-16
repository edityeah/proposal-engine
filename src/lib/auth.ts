import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { users, accounts, sessions, verificationTokens } from "./db/schema";
import { isAllowedEmail, isAdminEmail } from "./access";
import { cookies } from "next/headers";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "convegenius.ai";

// Local dev escape hatch: when DEV_NO_AUTH is set, skip Google/DB auth entirely
// and treat every request as a fixed admin user. Hard-gated to non-production so
// a stray env var can never disable auth on prod.
const DEV_NO_AUTH =
  process.env.DEV_NO_AUTH === "1" && process.env.NODE_ENV !== "production";

// Two dev "accounts" so both portals can be exercised without real auth.
function devSession(role: "admin" | "operator") {
  return {
    user: {
      id: role === "admin" ? "dev-admin" : "dev-user",
      name: role === "admin" ? "Local Admin" : "Local User",
      email: `${role === "admin" ? "admin" : "user"}@${ALLOWED_DOMAIN}`,
      image: null,
      role,
      state: null,
    },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

const nextAuth = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      // hd hints Google to show only org accounts; the signIn callback enforces it.
      authorization: { params: { hd: ALLOWED_DOMAIN, prompt: "select_account" } },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Hard gate: only @convegenius.ai (or configured domain) accounts may sign in.
    async signIn({ profile, user }) {
      const email = (profile?.email as string) || user?.email || "";
      return isAllowedEmail(email, ALLOWED_DOMAIN);
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = user as { role?: string; state?: string | null };
        // Admin if on the bootstrap allowlist OR promoted in the DB; else operator.
        const admin = isAdminEmail(session.user.email) || dbUser.role === "admin";
        (session.user as { role?: string }).role = admin ? "admin" : "operator";
        // State scoping (null = all states).
        (session.user as { state?: string | null }).state = dbUser.state ?? null;
      }
      return session;
    },
  },
});

// In DEV_NO_AUTH mode, auth() resolves to a fixed admin session and never
// touches Google or the DB; otherwise it's the real Auth.js implementation.
export const auth = (DEV_NO_AUTH
  ? (async () => {
      // Role is chosen on the /login picker and stored in a dev-only cookie.
      const role = (await cookies()).get("cg-dev-role")?.value;
      if (role === "admin") return devSession("admin");
      if (role === "operator") return devSession("operator");
      return null; // no role picked yet → the /login picker shows
    })
  : nextAuth.auth) as typeof nextAuth.auth;
export const { handlers, signIn, signOut } = nextAuth;
