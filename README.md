# ConveGenius Engine

The ConveGenius pre-sales & marketing team's internal platform — one place to do
the work that used to need ten different tools. Built on **Next.js + Vercel**,
with team login, persistence, and Claude + OpenAI under the hood.

It is organised into **modules** (pick one from the landing screen; the sidebar
then scopes to that module):

| Module | What it does |
| ------ | ------------ |
| **Proposal Engine** | Draft government-education proposals, PAB notes, RFP responses, concept notes, executive summaries and CM2 analyses; track win/loss. |
| **Marketing Engine** | Generate finished, on-brand collateral — branded `.pptx` decks today; images, carousels and campaigns next — from CG's brand grammar. |
| **Intelligence** | Research chat (web-grounded, multi-model) over the education ecosystem; knowledge base; RFP library. |
| **Admin** | Curate generation guidance, edit product prompts, manage costing templates and team access (admins only). |

**Live:** https://proposal-engine-beta.vercel.app

> The original single-file app (`index.html`, `netlify/`, `config/*.js`) is kept
> for reference only — not part of the Next.js build. Its prompt content was
> ported verbatim into `src/data/`.

## Stack

| Concern        | Choice                                                          |
| -------------- | -------------------------------------------------------------- |
| Framework/host | Next.js (App Router) on **Vercel**                             |
| Database       | **Neon Postgres** + Drizzle ORM                                |
| File storage   | **Vercel Blob** (RFPs, knowledge docs, generated assets)       |
| Auth           | **Auth.js (NextAuth v5)** — Google, `@convegenius.ai` only     |
| Models         | **Claude** (`claude-opus-4-8` default; Fable 5 / Sonnet / Haiku) and **OpenAI** (GPT-5.x, o3) — selectable in Research chat |
| Documents      | **pptxgenjs** (branded decks), **docx** + **pdfkit** (branded proposal exports), **sharp** (image processing) |

## Modules & features

### Proposal Engine
- Full generate flow: RFP upload → server-side text extraction → three-tier
  Swiftverse product selector → org/PSU → scale/budget/context.
- **Streamed** generation with checkpoint saves; every draft persisted.
- Document types: proposal, PAB note, RFP response, concept note, executive
  summary, CM2 analysis.
- **Refine** (optionally on a highlighted section) → new saved version.
- **History** with live Won/Lost/In-review metrics; **version compare** & restore.
- **Win/loss analytics** — win rate and breakdowns by state, product, doc type.
- **Branded exports** to `.docx` and PDF (CG colours, ₹ handling).

### Marketing Engine
- **Brand grammar** in code (`src/config/brand.ts`) — SwiftChat (locked) and
  ConveGenius (provisional) colours, fonts, logos, tone, proof points.
- **Product Distribution decks**: Claude drafts a structured deck → rendered to
  a real, brand-styled `.pptx` (cover, content, closing; embedded logo) →
  stored in Blob → downloadable. Brand toggle (SwiftChat / ConveGenius).
- More use cases (Social Media carousels/posts, etc.) staged next.

### Intelligence
- **Research chat** — web-grounded, action-oriented assistant over tenders,
  budgets, schemes and competitors; **multi-model** (Claude + OpenAI); can draft
  documents inline via tool use; saved threads.
- **Knowledge base** + **RFP library** — upload winning proposals, RFPs, SOPs,
  exhibits → Blob storage + extracted text; feeds RAG grounding.

### Admin (admins only)
- **Curation studio** — best-practices / proof-points / boilerplate injected
  into generations, scoped by doc type / product / state.
- **Products & prompts** — edit any product system prompt or generator prefix;
  overrides the built-in prompt server-side for all generations.
- **Costing templates** — CM2 engine (revenue → CM1 → CM2) for the CM2-analysis
  doc only; never surfaced in client-facing proposals.
- **Team access** — per-user role (admin / operator) and state scoping.

Cross-cutting: org-domain-gated login, all routes gated, per-state scoping for
operators, markdown rendered through DOMPurify, uploaded text wrapped as
untrusted reference data (prompt-injection guard), and a **Recents** list in each
module's sidebar.

## Setup (local)

Credentials go in `.env.local` (see `.env.example`):

1. **Neon Postgres** → `DATABASE_URL`
2. **Anthropic** → `ANTHROPIC_API_KEY`
3. **OpenAI** → `OPENAI_API_KEY` (enables OpenAI models in Research chat)
4. **Google OAuth** → `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`, plus
   `AUTH_SECRET` (`openssl rand -base64 32`). Redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://proposal-engine-beta.vercel.app/api/auth/callback/google`
5. **Vercel Blob** → `BLOB_READ_WRITE_TOKEN` (uploads + generated assets)

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
`main`. Set the env vars above in **Vercel → Settings → Environment Variables**,
link a **Blob** store (auto-injects `BLOB_READ_WRITE_TOKEN`), and add the
production redirect URI to the Google OAuth client. Run `npm run db:push` against
the production `DATABASE_URL` once.

> Note: these env vars are marked **Sensitive** in Vercel — `vercel env pull`
> returns them empty and overwrites `.env.local`. Don't use it to "restore" local
> env; re-enter values from their sources instead.

## Documentation

- [Product Overview](docs/PRODUCT_OVERVIEW.md) — the big picture ([PDF](docs/PRODUCT_OVERVIEW.pdf)).
- [User Guide](docs/USER_GUIDE.md) — every feature, where it is, how to use it ([PDF](docs/USER_GUIDE.pdf)).
- [Admin Guide](docs/ADMIN_GUIDE.md) — admin-only capabilities ([PDF](docs/ADMIN_GUIDE.pdf)).
- Design specs: [Phase 1](docs/2026-06-18-phase1-design.md), [platform evolution](docs/2026-06-19-platform-evolution-design.md).

## Layout

```
src/
  app/            routes + API (generate, proposals, knowledge, chat, marketing,
                  admin, costing, analytics, auth)
  components/     AppShell, ModuleHome, Sidebar, SidebarRecents,
                  GenerateForm, OutputView, HistoryView, KnowledgeView, ChatView,
                  MarketingStudio, ProductsAdmin, CurationStudio, CostingView,
                  AnalyticsView, TeamAdmin, VersionHistory
  lib/            nav, prompt, anthropic, chat, openai-chat, costing, retrieval,
                  render, docx, pdf, access, marketing/deck, db/*
  config/         brand, orgs, states, dropdowns
  data/           PRODUCTS / GENERATORS (ported verbatim from the old config/)
docs/             product overview, user & admin guides, design specs
```
