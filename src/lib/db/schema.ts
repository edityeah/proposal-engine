import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ─────────────────────────────────────────────────────────────
// Auth.js tables (Drizzle adapter — Postgres)
// ─────────────────────────────────────────────────────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // App-specific: role within the pre-sales team.
  role: text("role").notNull().default("member"), // 'member' | 'admin'
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ─────────────────────────────────────────────────────────────
// App tables
// ─────────────────────────────────────────────────────────────

// A generated document. `inputs` captures the full form payload (state,
// scale, budget, module selection, etc.) so a proposal is fully reproducible.
export const proposals = pgTable("proposal", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  productId: text("product_id"),
  productName: text("product_name"),
  generatorId: text("generator_id"),
  generatorLabel: text("generator_label"),
  proposalType: text("proposal_type"), // 'vsk' | 'vai' | 'module'
  state: text("state"),
  org: text("org"),
  inputs: jsonb("inputs").notNull().$type<Record<string, unknown>>(),
  rfpBlobUrl: text("rfp_blob_url"),
  rfpFilename: text("rfp_filename"),
  output: text("output").notNull().default(""),
  model: text("model"),
  status: text("status").notNull().default("draft"), // draft | in_review | won | lost
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// Append-only history. The initial generation is version 1; every "refine
// section" produces a new version. proposals.output always mirrors the latest.
export const proposalVersions = pgTable("proposal_version", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalId: uuid("proposal_id")
    .notNull()
    .references(() => proposals.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  label: text("label"), // e.g. "Initial draft", "Refine: Risk section"
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
export type ProposalVersion = typeof proposalVersions.$inferSelect;

// ─────────────────────────────────────────────────────────────
// Phase 2 — Knowledge base / RFP library, and editable prompt overrides
// ─────────────────────────────────────────────────────────────

// Uploaded reference material: winning proposals, issued RFPs, SOPs, exhibits.
// `text` holds extracted content used for Phase-3 retrieval (RAG).
export const knowledgeDocuments = pgTable("knowledge_document", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  kind: text("kind").notNull(), // winning_proposal | rfp | sop | exhibit | toc
  title: text("title").notNull(),
  state: text("state"),
  tags: jsonb("tags").$type<string[]>().default([]),
  blobUrl: text("blob_url"),
  filename: text("filename"),
  text: text("text").notNull().default(""),
  words: integer("words").notNull().default(0),
  status: text("status").notNull().default("active"), // active | archived
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// Admin-editable overrides for product system prompts and generator prefixes.
// refType+refId is unique; generation prefers the override when present.
export const promptOverrides = pgTable(
  "prompt_override",
  {
    refType: text("ref_type").notNull(), // 'product' | 'generator'
    refId: text("ref_id").notNull(),
    content: text("content").notNull(),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.refType, t.refId] })],
);

export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type PromptOverride = typeof promptOverrides.$inferSelect;

// ─────────────────────────────────────────────────────────────
// Phase 5 — Curation Studio: admin-maintained guidance injected into drafts
// ─────────────────────────────────────────────────────────────

// kind: 'best_practice' (how-to / norms), 'proof_point' (facts/numbers/awards),
// 'boilerplate' (reusable approved sections). Scope filters control where each
// entry is injected; empty docTypes/products = applies everywhere.
export const curationEntries = pgTable("curation_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  docTypes: jsonb("doc_types").$type<string[]>().default([]), // generator ids
  products: jsonb("products").$type<string[]>().default([]), // product ids
  state: text("state"), // null = all states
  enabled: integer("enabled").notNull().default(1), // 1 on, 0 off
  status: text("status").notNull().default("active"), // active | archived
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export type CurationEntry = typeof curationEntries.$inferSelect;
