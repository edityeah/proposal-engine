import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const email = process.argv[2] || "aditya.c@convegenius.ai";
const rows = await sql`select id, role, state from "user" where email = ${email}`;
if (!rows.length) { console.error("NO_USER"); process.exit(1); }
const token = crypto.randomUUID() + "." + crypto.randomUUID();
const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
await sql`insert into session ("sessionToken","userId","expires") values (${token}, ${rows[0].id}, ${expires})`;
console.log(token);
