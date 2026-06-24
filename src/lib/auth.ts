import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { users, accounts, sessions, verificationTokens } from "./db/schema";
import { isAllowedEmail, isAdminEmail } from "./access";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "convegenius.ai";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
