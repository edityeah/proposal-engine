import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { users, accounts, sessions, verificationTokens } from "./db/schema";
import { isAllowedEmail, roleFor } from "./access";

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
        // Role is derived from the admin allowlist (source of truth), so the
        // two seeded admins are admins regardless of DB state.
        (session.user as { role?: string }).role = roleFor(session.user.email);
      }
      return session;
    },
  },
});
