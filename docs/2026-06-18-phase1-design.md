# Proposal Engine — Phase 1 Design (Foundation + Core Loop)

Date: 2026-06-18

## Context

Inherited a single-file vanilla-JS app (`index.html`) + one Netlify function
that calls Claude to draft government education proposals. ~40% of the UI was
mocked (history, knowledge base, admin, outcomes). Goal: make it a real team
tool and improve output quality, sequenced as a roadmap.

## Roadmap

1. **Phase 1 (this doc)** — Foundation + core loop: backend (DB + storage +
   team login), persisted generation, real history, working refine, `.docx`
   export, outcome tracking, security fixes.
2. **Phase 2** — Knowledge base & RFP library storage; move products/generators
   config into the DB so admin editors save.
3. **Phase 3** — Output quality: ground generation in winning proposals + past
   RFPs + real deployment numbers (RAG); CM2 auto-calc.
4. **Phase 4** — Variant comparison, versioning UI, win/loss analytics.

## Decisions

- Host **Vercel**; framework **Next.js (App Router)** — chosen over staying
  vanilla because Auth.js + server-side Claude calls + breaking up the 1938-line
  file are all idiomatic in Next, and Phase 1 rebuilds the shell anyway.
- DB **Neon Postgres** via the Vercel Marketplace (US/EU; data residency not
  required for these internal drafts) + **Drizzle ORM**.
- Storage **Vercel Blob**.
- Auth **Auth.js (NextAuth v5)**, Google provider, hard-gated to
  `@convegenius.ai` in the `signIn` callback.
- Model **`claude-opus-4-8`**, streamed, adaptive thinking (upgrade from the
  old `claude-sonnet-4-6` for quality).

## Data model

- `user` / `account` / `session` / `verificationToken` — Auth.js (Drizzle adapter).
  `user.role` added for later admin gating.
- `proposal` — owner, title, product/generator ids, `proposal_type`, `state`,
  `org`, `inputs` (jsonb — full reproducible payload), `rfp_blob_url`,
  `rfp_filename`, `output` (markdown), `model`, `status`
  (draft|in_review|won|lost), timestamps.
- `proposal_version` — append-only; v1 = initial draft, each refine adds a
  version; `proposal.output` mirrors the latest.

## Module boundaries

- `lib/prompt.ts` — pure prompt assembly (ported from `generate.js`) + RFP
  injection hardening + validation. Unit-tested.
- `lib/anthropic.ts` — streaming wrapper around the SDK.
- `lib/access.ts` — pure `isAllowedEmail` domain gate. Unit-tested.
- `lib/db/*` — schema + queries.
- `lib/docx.ts`, `lib/render.ts` — export and safe markdown render.
- `app/api/*` — generate (stream), proposals CRUD, refine (stream), export, rfp upload.
- `components/*` — AppShell orchestrates; GenerateForm, OutputView, HistoryView,
  Sidebar are focused.

## Security

- All API routes call `auth()`; pages redirect; middleware is a fast cookie
  pre-filter only (Edge-safe, non-authoritative).
- Model output rendered via `marked` + DOMPurify (replaces the old unsanitized
  `innerHTML`/`insertAdjacentHTML`).
- Uploaded RFP text is delimited and explicitly marked as data-not-instructions.

## Out of scope (Phase 1)

Knowledge base upload, RFP library, admin editors that save, RAG, analytics,
CM2 auto-calc, PDF export.
