import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// neon() only stores the connection string; it doesn't connect until a query
// runs. A placeholder keeps `next build` working when the env isn't present
// (e.g. CI without secrets); real queries require a valid DATABASE_URL at runtime.
if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set — database queries will fail. See .env.example.");
}

const sql = neon(
  process.env.DATABASE_URL ||
    "postgresql://placeholder:placeholder@placeholder.neon.tech/placeholder",
);
export const db = drizzle(sql, { schema });
export { schema };
