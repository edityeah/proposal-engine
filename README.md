# ConveGenius Pre-Sales Engine — Phase 1

A team tool for generating government education proposals with Claude. Migrated
from the original single-file `index.html` + Netlify function to **Next.js on
Vercel**, with persistence, team login, RFP grounding, refine, and export.

> The original app (`index.html`, `netlify/`, `config/*.js`) is kept for
> reference only — it is not part of the Next.js build. The valuable prompt
> content was ported verbatim into `src/data/`.

## Stack

| Concern        | Choice                                        |
| -------------- | --------------------------------------------- |
| Framework/host | Next.js (App Router) on **Vercel**            |
| Database       | **Neon Postgres** (Vercel Marketplace) + Drizzle ORM |
| File storage   | **Vercel Blob** (uploaded RFPs)               |
| Auth           | **Auth.js (NextAuth v5)** — Google, `@convegenius.ai` only |
| Model          | `claude-opus-4-8` (streamed, adaptive thinking) |

## What works in Phase 1

- Google sign-in restricted to the org domain; all routes gated.
- The full generate form (RFP upload → server-side text extraction → three-tier
  Swiftverse product selector → org/PSU → scale/budget/context).
- **Streamed** generation; every draft persisted to Postgres.
- **History** — team-wide list with live Won/Lost/In-review metrics.
- **Refine** — describe a change (optionally highlight text); the model returns a
  revised draft saved as a new version.
- **Export** to `.docx`.
- Security: markdown rendered through DOMPurify (no raw `innerHTML`); uploaded
  RFP text is wrapped as untrusted reference data (prompt-injection guard).

Deferred to later phases (stubbed in the sidebar): knowledge base, RFP library,
admin product/costing editors, RAG grounding, analytics, PDF export.

## Setup (runbook)

You need four external credentials. Put them in `.env.local` for local dev and
in **Vercel → Project → Settings → Environment Variables** for deploy. See
`.env.example` for the full list.

1. **Neon Postgres** — in Vercel: Storage → Create → Neon. Copy the pooled
   connection string into `DATABASE_URL`.
2. **Anthropic** — `ANTHROPIC_API_KEY` from the Anthropic console.
3. **Google OAuth** — Google Cloud Console → Credentials → OAuth client (Web).
   Redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-domain>/api/auth/callback/google`
   Set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`. Generate `AUTH_SECRET` with
   `openssl rand -base64 32`.
4. **Vercel Blob** — Storage → Create → Blob → copy `BLOB_READ_WRITE_TOKEN`.

Then:

```bash
npm install
cp .env.example .env.local   # fill in the four credentials above
npm run db:push              # create the tables in Neon
npm run dev                  # http://localhost:3000
```

Useful scripts: `npm run typecheck`, `npm run test`, `npm run db:generate`
(create a migration), `npm run db:migrate` (apply migrations in CI/prod).

## Deploy

Push to a Git repo, import into Vercel, add the env vars, deploy. Run
`npm run db:push` (or `db:migrate`) against the production `DATABASE_URL` once.

## Layout

```
src/
  app/            routes + API (generate, proposals, rfp/upload, auth)
  components/     AppShell, GenerateForm, OutputView, HistoryView, Sidebar
  lib/            prompt assembly, anthropic stream, db, docx, render, access
  data/           PRODUCTS / GENERATORS (ported verbatim from the old config/)
  config/         orgs, states, dropdowns
docs/             design spec
```
