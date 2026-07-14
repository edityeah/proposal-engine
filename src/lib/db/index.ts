import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

// Local dev: USE_LOCAL_DB runs an in-process Postgres (PGlite) persisted to
// ./.localdb — no Neon, no Docker. Tables + seed data are created by
// `scripts/seed-local-db.mjs`. Otherwise use Neon over HTTP as in production.
const USE_LOCAL_DB = process.env.USE_LOCAL_DB === "1";

// neon() only stores the connection string; it doesn't connect until a query
// runs. A placeholder keeps `next build` working when the env isn't present
// (e.g. CI without secrets); real queries require a valid DATABASE_URL at runtime.
if (!USE_LOCAL_DB && !process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set — database queries will fail. See .env.example.");
}

// PGlite allows exactly ONE connection to a data directory at a time, and its
// WASM engine aborts if a second instance opens it. Next dev re-evaluates
// modules on HMR and across route segments, which would spawn multiple
// instances — so cache the client/db on globalThis to guarantee a singleton
// for the lifetime of the server process.
type DbGlobal = typeof globalThis & { __cgLocalDb?: ReturnType<typeof makeLocalDb> };

function makeLocalDb() {
  const client = new PGlite(process.env.LOCAL_DB_DIR || ".localdb");
  return drizzlePglite(client, { schema });
}

function localDb() {
  const g = globalThis as DbGlobal;
  if (!g.__cgLocalDb) g.__cgLocalDb = makeLocalDb();
  return g.__cgLocalDb;
}

export const db = USE_LOCAL_DB
  ? localDb()
  : drizzleNeon(
      neon(
        process.env.DATABASE_URL ||
          "postgresql://placeholder:placeholder@placeholder.neon.tech/placeholder",
      ),
      { schema },
    );

export { schema };
