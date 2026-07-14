// Creates the schema + seed data in a local PGlite database (./.localdb).
// Run once: `node scripts/seed-local-db.mjs`. Safe to re-run (drops & recreates).
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";

const DIR = process.env.LOCAL_DB_DIR || ".localdb";
const db = new PGlite(DIR);

const DDL = `
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text UNIQUE,
  "emailVerified" timestamp,
  "image" text,
  "role" text NOT NULL DEFAULT 'operator',
  "state" text
);
CREATE TABLE IF NOT EXISTS "account" (
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "type" text NOT NULL, "provider" text NOT NULL, "providerAccountId" text NOT NULL,
  "refresh_token" text, "access_token" text, "expires_at" integer, "token_type" text,
  "scope" text, "id_token" text, "session_state" text,
  PRIMARY KEY ("provider","providerAccountId")
);
CREATE TABLE IF NOT EXISTS "session" (
  "sessionToken" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);
CREATE TABLE IF NOT EXISTS "verificationToken" (
  "identifier" text NOT NULL, "token" text NOT NULL, "expires" timestamp NOT NULL,
  PRIMARY KEY ("identifier","token")
);
CREATE TABLE IF NOT EXISTS "proposal" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" text NOT NULL, "product_id" text, "product_name" text,
  "generator_id" text, "generator_label" text, "proposal_type" text,
  "state" text, "org" text, "inputs" jsonb NOT NULL,
  "rfp_blob_url" text, "rfp_filename" text,
  "output" text NOT NULL DEFAULT '', "model" text,
  "status" text NOT NULL DEFAULT 'draft',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "proposal_version" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "proposal_id" uuid NOT NULL REFERENCES "proposal"("id") ON DELETE CASCADE,
  "version" integer NOT NULL, "content" text NOT NULL, "label" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "knowledge_document" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "uploaded_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "kind" text NOT NULL, "title" text NOT NULL, "state" text,
  "tags" jsonb DEFAULT '[]'::jsonb, "blob_url" text, "filename" text,
  "text" text NOT NULL DEFAULT '', "words" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "prompt_override" (
  "ref_type" text NOT NULL, "ref_id" text NOT NULL, "content" text NOT NULL,
  "updated_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("ref_type","ref_id")
);
CREATE TABLE IF NOT EXISTS "curation_entry" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" text NOT NULL, "title" text NOT NULL, "content" text NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb, "doc_types" jsonb DEFAULT '[]'::jsonb,
  "products" jsonb DEFAULT '[]'::jsonb, "state" text,
  "enabled" integer NOT NULL DEFAULT 1, "status" text NOT NULL DEFAULT 'active',
  "updated_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "chat_thread" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" text NOT NULL DEFAULT 'New chat', "model" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "chat_message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL REFERENCES "chat_thread"("id") ON DELETE CASCADE,
  "role" text NOT NULL, "content" text NOT NULL, "proposal_id" uuid,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "marketing_asset" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "brand" text NOT NULL, "type" text NOT NULL, "use_case" text,
  "title" text NOT NULL, "brief" jsonb NOT NULL, "spec" jsonb,
  "blob_url" text, "filename" text, "model" text, "state" text,
  "status" text NOT NULL DEFAULT 'ready',
  "created_at" timestamp NOT NULL DEFAULT now()
);
`;

async function main() {
  await db.exec(DDL);

  // Wipe app data (keep it idempotent) — order respects FKs.
  await db.exec(`
    DELETE FROM chat_message; DELETE FROM chat_thread;
    DELETE FROM proposal_version; DELETE FROM proposal;
    DELETE FROM marketing_asset; DELETE FROM knowledge_document;
    DELETE FROM curation_entry; DELETE FROM prompt_override;
    DELETE FROM account; DELETE FROM session; DELETE FROM "user";
  `);

  // ── Users (dev-user matches the DEV_NO_AUTH mock session id) ──
  const users = [
    ["dev-user", "Local Dev", "dev@convegenius.ai", "admin", null],
    ["dev-admin", "Local Admin", "admin@convegenius.ai", "admin", null], // matches auth.ts admin-portal session id

    ["u-op-up", "Aarti Sharma", "aarti@convegenius.ai", "operator", "Uttar Pradesh"],
    ["u-op-mh", "Rohan Mehta", "rohan@convegenius.ai", "operator", "Maharashtra"],
    ["u-admin-2", "Priya Nair", "priya@convegenius.ai", "admin", null],
  ];
  for (const [id, name, email, role, state] of users) {
    await db.query(
      `INSERT INTO "user"(id,name,email,role,state) VALUES ($1,$2,$3,$4,$5)`,
      [id, name, email, role, state],
    );
  }

  // ── Knowledge base / RFP library ──
  const docs = [
    ["winning_proposal", "UP Basic Education — Winning Proposal FY24", "Uttar Pradesh",
      ["fln", "state-scale", "won"], "up-winning-proposal-fy24.pdf",
      "Winning proposal for the UP Basic Education Department covering NIPUN Bharat FLN outcomes, Swiftverse deployment across 1.3L schools, and a phased rollout with quarterly PAB reviews. Budget ₹42 Cr over 3 years.", 4200],
    ["rfp", "MP Rajya Shiksha Kendra — RFP for Digital Learning", "Madhya Pradesh",
      ["rfp", "digital-learning"], "mp-rsk-rfp-2026.pdf",
      "Request for Proposal issued by MP Rajya Shiksha Kendra for a state-wide digital learning and assessment platform. Eligibility: 3+ years, 2 state deployments. Scope: LMS, teacher training, analytics dashboard.", 6800],
    ["sop", "ConveGenius Delivery SOP — State Onboarding", null,
      ["sop", "delivery", "internal"], "cg-delivery-sop.docx",
      "Standard operating procedure for onboarding a new state: kickoff, data-sharing MoU, master-trainer cascade, school mapping, go-live checklist, and the monthly outcome review cadence.", 2100],
    ["exhibit", "NIPUN Impact Evidence Pack", null,
      ["proof", "impact", "fln"], "nipun-impact-pack.pdf",
      "Third-party evaluation evidence: +23% improvement in Grade 3 oral reading fluency across intervention districts; teacher adoption 87%; parent-connect engagement 61% MoM.", 1500],
  ];
  for (const [kind, title, state, tags, filename, text, words] of docs) {
    await db.query(
      `INSERT INTO knowledge_document(uploaded_by,kind,title,state,tags,filename,text,words,status)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,'active')`,
      ["dev-user", kind, title, state, JSON.stringify(tags), filename, text, words],
    );
  }

  // ── Curation studio entries ──
  const curation = [
    ["best_practice", "Lead with measurable FLN outcomes",
      "Open every education proposal with the state's own NIPUN/FLN baseline and the specific, time-bound outcome we commit to (e.g. 'Grade 3 ORF from 45% to 68% in 18 months'). Quantify before describing features.",
      ["fln", "structure"], ["proposal", "concept_note"], []],
    ["proof_point", "23% ORF improvement (third-party validated)",
      "Independent evaluation across UP intervention districts recorded a +23% improvement in Grade 3 oral reading fluency within one academic year. Cite for impact/credibility sections.",
      ["impact", "evidence"], [], []],
    ["boilerplate", "Data privacy & DPDP compliance clause",
      "All student data is processed within India on state-owned cloud infrastructure, encrypted at rest and in transit, with role-based access and full DPDP Act 2023 compliance. No student PII leaves the state boundary.",
      ["compliance", "privacy"], ["proposal", "rfp_response", "pab_note"], []],
  ];
  for (const [kind, title, content, tags, docTypes, products] of curation) {
    await db.query(
      `INSERT INTO curation_entry(kind,title,content,tags,doc_types,products,enabled,status,updated_by)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,1,'active','dev-user')`,
      [kind, title, content, JSON.stringify(tags), JSON.stringify(docTypes), JSON.stringify(products)],
    );
  }

  // ── Prompt overrides: intentionally none. Overrides mask the built-in
  // prompts from src/data, so leaving this empty means the Products & Prompts
  // admin view shows exactly what's in the repo. ──

  // ── Proposals (with a version each) + analytics variety ──
  const proposals = [
    ["UP Basic Education — Swiftverse VSK 1.0 Proposal", "vsk1", "Swiftverse VSK 1.0",
      "proposal", "Full Proposal", "vsk", "Uttar Pradesh", "UP Basic Education Dept",
      "won", "# UP Basic Education — Swiftverse VSK 1.0\n\n## Executive Summary\nA state-wide FLN acceleration programme...\n\n## Outcomes\n- Grade 3 ORF: 45% → 68% in 18 months\n\n## Budget\n₹42 Cr over 3 years."],
    ["MP RSK — RFP Response (Digital Learning)", "vsk2", "Swiftverse VSK 2.0",
      "rfp_response", "RFP Response", "vsk", "Madhya Pradesh", "MP Rajya Shiksha Kendra",
      "in_review", "# MP RSK — RFP Response\n\n## Compliance Matrix\nAll mandatory clauses addressed...\n\n## Technical Approach\nLMS + assessment + analytics."],
    ["Rajasthan Concept Note — Parent Connect", "vsk1", "Swiftverse VSK 1.0",
      "concept_note", "Concept Note", "module", "Rajasthan", "Rajasthan Council of School Education",
      "lost", "# Rajasthan — Parent Connect Concept Note\n\n## Problem\nLow parent engagement in rural blocks...\n\n## Solution\nWhatsApp-first Parent Connect bot."],
  ];
  for (const [title, pid, pname, gid, glabel, ptype, state, org, status, output] of proposals) {
    const propId = randomUUID();
    const inputs = { state, org, scale: "state", budget: "₹40-50 Cr", product: pid, generator: gid };
    await db.query(
      `INSERT INTO proposal(id,user_id,title,product_id,product_name,generator_id,generator_label,proposal_type,state,org,inputs,output,model,status)
       VALUES ($1,'dev-user',$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,'claude-opus-4-8',$12)`,
      [propId, title, pid, pname, gid, glabel, ptype, state, org, JSON.stringify(inputs), output, status],
    );
    await db.query(
      `INSERT INTO proposal_version(proposal_id,version,content,label) VALUES ($1,1,$2,'Initial draft')`,
      [propId, output],
    );
  }

  // ── Marketing asset ──
  await db.query(
    `INSERT INTO marketing_asset(user_id,brand,type,use_case,title,brief,spec,filename,model,status)
     VALUES ('dev-user','swiftchat','deck','product_distribution',$1,$2::jsonb,$3::jsonb,'swiftverse-distribution.pptx','claude-opus-4-8','ready')`,
    ["Swiftverse Product Distribution — State Sales Deck",
      JSON.stringify({ audience: "State education secretaries", tone: "confident, evidence-led", slides: 8 }),
      JSON.stringify({ cover: "Swiftverse for State-Scale FLN", sections: ["Problem", "Platform", "Proof", "Rollout", "Commercials"] })],
  );

  // ── Research chat thread + messages ──
  const threadId = randomUUID();
  await db.query(
    `INSERT INTO chat_thread(id,user_id,title,model) VALUES ($1,'dev-user',$2,'claude-opus-4-8')`,
    [threadId, "Karnataka FLN tender landscape"],
  );
  await db.query(
    `INSERT INTO chat_message(thread_id,role,content) VALUES ($1,'user',$2)`,
    [threadId, "What FLN tenders are active in Karnataka right now and who are the likely competitors?"],
  );
  await db.query(
    `INSERT INTO chat_message(thread_id,role,content) VALUES ($1,'assistant',$2)`,
    [threadId, "Karnataka's Samagra Shiksha has floated a state-wide FLN assessment RFP (est. ₹18-22 Cr). Likely competitors: EkStep-backed vendors and one national LMS incumbent. Our edge: state-owned cloud + validated NIPUN outcomes."],
  );

  const counts = await db.query(`
    SELECT
      (SELECT count(*) FROM "user") users,
      (SELECT count(*) FROM knowledge_document) knowledge,
      (SELECT count(*) FROM curation_entry) curation,
      (SELECT count(*) FROM prompt_override) overrides,
      (SELECT count(*) FROM proposal) proposals,
      (SELECT count(*) FROM marketing_asset) marketing,
      (SELECT count(*) FROM chat_thread) threads
  `);
  console.log("Seeded local DB at", DIR);
  console.table(counts.rows);
  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
