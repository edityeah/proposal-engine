# ConveGenius Pre-Sales Engine

A team tool for generating government education proposals with Claude. Migrated
from the original single-file `index.html` + Netlify function to **Next.js on
Vercel**, with persistence, team login, RFP grounding, refine, exports, a
knowledge base, admin prompt editing, CM2 costing, and win/loss analytics.

**Live:** https://proposal-engine-beta.vercel.app

> The original app (`index.html`, `netlify/`, `config/*.js`) is kept for
> reference only — it is not part of the Next.js build. The prompt content was
> ported verbatim into `src/data/`.

## Stack

| Concern        | Choice                                        |
| -------------- | --------------------------------------------- |
| Framework/host | Next.js (App Router) on **Vercel**            |
| Database       | **Neon Postgres** + Drizzle ORM               |
| File storage   | **Vercel Blob** (uploaded RFPs / knowledge)   |
| Auth           | **Auth.js (NextAuth v5)** — Google, `@convegenius.ai` only |
| Model          | `claude-opus-4-8` (streamed, adaptive thinking) |

## Features (all phases complete)

**Phase 1 — foundation + core loop**
- Google sign-in restricted to the org domain; all routes gated.
- Full generate form (RFP upload → server-side text extraction → three-tier
  Swiftverse product selector → org/PSU → scale/budget/context).
- **Streamed** generation; every draft persisted to Postgres.
- **History** — team-wide list with live Won/Lost/In-review metrics.
- **Refine** — describe a change (optionally highlight text); model returns a
  revised draft saved as a new version.
- **Export** to **`.docx` and PDF**.
- Security: markdown rendered through DOMPurify (no raw `innerHTML`); uploaded
  RFP text wrapped as untrusted reference data (prompt-injection guard).

**Phase 2 — knowledge & admin**
- **Knowledge base** + **RFP library**: upload winning proposals, RFPs, SOPs,
  exhibits → stored in Vercel Blob with extracted text.
- **Products & prompts** admin: edit any product system prompt or generator
  prefix; edits override the built-in prompt server-side for all generations.

**Phase 3 — output quality**
- **RAG grounding**: relevant past material (by state + keywords) is retrieved
  from the knowledge base and injected into the prompt as reference.
- **CM2 auto-calc**: a costing engine (Costing view) computes revenue → CM1 →
  CM2 from budget/scale; figures feed the CM2-analysis document generator only
  (never client-facing proposals).

**Phase 4 — comparison & analytics**
- **Version history**, **restore**, and **side-by-side compare** of versions.
- **Win/loss analytics** dashboard — win rate, breakdowns by state, product,
  and document type.

## Setup (local)

Needs four external credentials (see `.env.example`). Put them in `.env.local`.

1. **Neon Postgres** → `DATABASE_URL`
2. **Anthropic** → `ANTHROPIC_API_KEY`
3. **Google OAuth** (`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`), plus
   `AUTH_SECRET` (`openssl rand -base64 32`). Redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://proposal-engine-beta.vercel.app/api/auth/callback/google`
4. **Vercel Blob** → `BLOB_READ_WRITE_TOKEN` (only needed for uploads)

```bash
npm install
cp .env.example .env.local   # fill in credentials
npm run db:push              # create tables in Neon
npm run dev                  # http://localhost:3000
```

Scripts: `npm run typecheck`, `npm run test`, `npm run build`,
`npm run db:generate` / `db:migrate` / `db:push`.

Live integration self-test (real DB + a real Claude call):
```bash
set -a && . ./.env.local && set +a
npx vitest run src/selftest.itest.ts --config vitest.selftest.config.ts
```

## Deploy (Vercel)

Connected to GitHub (`edityeah/proposal-engine`); Vercel auto-deploys on push to
`main`. Set the six env vars above in **Vercel → Settings → Environment
Variables**, add a **Blob** store (auto-injects `BLOB_READ_WRITE_TOKEN`), and
add the production redirect URI to the Google OAuth client. Run `npm run db:push`
against the production `DATABASE_URL` once.

## Documentation

- [Product Overview](docs/PRODUCT_OVERVIEW.md) — what the product is, what's possible, how it works (the big picture). Also as [PDF](docs/PRODUCT_OVERVIEW.pdf).
- [User Guide](docs/USER_GUIDE.md) — every feature, where to find it, how to use it ([PDF](docs/USER_GUIDE.pdf)).
- [Admin Guide](docs/ADMIN_GUIDE.md) — admin-only capabilities ([PDF](docs/ADMIN_GUIDE.pdf)).
- [Phase 1 design spec](docs/2026-06-18-phase1-design.md).

## Layout

```
src/
  app/            routes + API (generate, proposals, knowledge, admin, costing, analytics, auth)
  components/     AppShell + GenerateForm, OutputView, HistoryView, KnowledgeView,
                  ProductsAdmin, CostingView, AnalyticsView, VersionHistory, Sidebar
  lib/            prompt, anthropic, costing, retrieval, render, docx, pdf, db/*
  data/           PRODUCTS / GENERATORS (ported verbatim from the old config/)
  config/         orgs, states, dropdowns
docs/             design spec
```
