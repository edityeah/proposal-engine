# ConveGenius Engine — Platform Evolution Design

Date: 2026-06-19

## Context

The Proposal Engine is being repositioned into a single **internal platform** ("ConveGenius Engine") with multiple modules, replacing reliance on an external marketing agency (Team Big Cause) and 10+ point tools. Based on the Brand & Strategic Comms Engine BRD.

## Modules
- **Proposal Engine** (built) — government proposals/RFP responses (the BRD's "Contract Engine", kept under this name).
- **Marketing Engine** (new) — finished, on-brand marketing collateral across the BRD's 7 use cases.
- **Shared services:** Intelligence backbone, Asset library (tagged, per-state), Roles + per-state access, Approval tiers, Analytics.

## Key product decisions
- **Real, finished assets** (not just briefs): editable branded **.pptx** decks (in-house via pptxgenjs + brand master), **images/carousels/backdrops** (branded HTML/SVG templates → PNG via Satori/resvg + AI imagery from OpenAI's image model), **social copy** (existing pipeline). Claude can't generate images; OpenAI image model covers imagery. Gamma/GenSpark optional later (auto-design style, less brand-lock).
- **Brand grammar = everything** — logo, colours, fonts, slide/image templates form a locked brand layer; only scoped local fields are editable.
- **Intelligence backbone** — admin-uploadable product-intelligence docs (a shared format derived from CG's existing product docs) **plus Jira integration** for living, always-current product intelligence (product evolves; one-time dump is insufficient).
- **Per-state views + Admin/Operator roles** — operators see their state's assets + shared; admins see all.

## Roadmap
- **P1 — Foundation (this build):** reposition into Proposal + Marketing modules; per-state scoping; Admin/Operator roles in DB (email allowlist stays the bootstrap admin set); Team-access management screen; generalise history/analytics scoping by state; Marketing module shows the 7 use cases as upcoming.
- **P2 — First real Marketing assets (UC-1 Product Distribution + UC-2 Social):** branded `.pptx` deck generator, social copy, image carousels/posts; tagged asset library + approval tiers.
- **P3 — Living intelligence:** Jira integration + admin product-doc upload in an agreed format.
- **P4 — Remaining use cases** (Events, Thought Leadership, Impact, General) + more formats.

## P1 detail
- `users.state` added (null = all states / Founder's Office & admins). Role in DB (`admin` | `operator`), with the email allowlist always resolving to admin.
- Team access screen (admin-only): list users, set role + state.
- Proposals/history/analytics scoped: operators → own state + unscoped; admins → all (with optional state filter).
- Sidebar grouped: **Proposal Engine**, **Marketing Engine** (coming-soon use-case tiles), **Intelligence**, **Admin**.

## Tech additions (later phases)
pptxgenjs (P2), satori + @resvg/resvg-js (P2 images), OpenAI image model (P2), Jira REST API (P3).
