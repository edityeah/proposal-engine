// Inception-report distillation.
//
// An inception report is a long (20+ page) post-award document. Dumped whole
// into the KB it's useless — retrieval only injects the first ~1500 chars. So we
// distill it into two things the generator already reads:
//   1. section-level KB chunks (each short enough that its whole text is retrieved)
//   2. scoped curation entries (best_practice / boilerplate / proof_point)
//
// HOUSE RULE (see MEMORY: inception-report-patterns-not-details): capture the
// PATTERN / structure / moves — never lift a specific figure, state, scheme, or
// org name. Any place a real number would go becomes an [INSERT: …] placeholder.

import OpenAI from "openai";
import { anthropic, PROPOSAL_MODEL } from "@/lib/anthropic";
import { streamGeminiMessages, geminiConfigured } from "@/lib/gemini";

export interface InceptionSection { title: string; tags: string[]; content: string }
export interface InceptionCuration {
  kind: "best_practice" | "boilerplate" | "proof_point";
  title: string;
  content: string;
  docTypes: string[];
}
export interface InceptionDistillation {
  sections: InceptionSection[];
  curation: InceptionCuration[];
}

// The doc types an inception report legitimately strengthens. cm2_analysis and
// the financial bid are deliberately excluded — an inception report has no
// costing, so its patterns must never be scoped there.
const ALLOWED_DOCTYPES = ["proposal", "rfp_response", "executive_summary", "concept_note", "pab_note"];
const DEFAULT_DOCTYPES = ["proposal", "rfp_response", "executive_summary", "concept_note"];

const SYSTEM = [
  "You are the ConveGenius Pre-Sales inception-report distiller. You read ONE inception report (a long post-award document) and turn it into reusable STRUCTURE for a proposal-writing engine — never into reusable content.",
  "",
  "IRON RULE — PATTERNS, NOT DETAILS:",
  "- Capture the *move* / the shape / the section-order, never a specific number, percentage, state, district, scheme, product, org, or date lifted from the document.",
  "- Wherever a concrete figure or name would go, write a marked [INSERT: …] placeholder describing what belongs there (e.g. [INSERT: state FLN baseline %, source + year]).",
  "- Never fabricate a figure. Never present a rate as a value to reuse.",
  "",
  "Return STRICT JSON only (no prose, no code fences) matching exactly this shape:",
  "{",
  '  "sections": [ { "title": string, "tags": string[], "content": string } ],',
  '  "curation": [ { "kind": "best_practice"|"boilerplate"|"proof_point", "title": string, "content": string, "docTypes": string[] } ]',
  "}",
  "",
  "sections: one entry per MAJOR section of the report (e.g. org & credibility, past-experience track record, methodology, each solution area, phasing & O&M, outcomes). `content` is a compact PATTERN summary of that section — the moves and structure a writer should reuse, with [INSERT: …] placeholders instead of specifics. Keep each `content` under ~900 characters. `tags` are 2–5 lowercase keywords for retrieval.",
  "",
  "curation: 3–8 durable, reusable entries. Use `best_practice` for structural moves (e.g. how to open, how to order a solution write-up as Description → Key Features → phased Implementation), `boilerplate` for reusable approved section shapes, `proof_point` ONLY for org-level credibility patterns (still as patterns with [INSERT] for the actual numbers). `docTypes` must be a subset of: " + ALLOWED_DOCTYPES.join(", ") + ". Never include cm2_analysis or a financial-only scope.",
  "",
  "HOUSE STYLE to reinforce: formal government-note register; quantified with evidence cited source + year (NAS / PARAKH / UDISE+); every rupee mapped to a PAB head; costing structure component → physical units → unit cost → total → ₹ lakhs tagged R/NR.",
].join("\n");

function buildUser(text: string, opts: { docTitle: string; state?: string; product?: string }): string {
  return [
    `INCEPTION REPORT: ${opts.docTitle}`,
    opts.state ? `STATE (context only — do not hard-code into patterns): ${opts.state}` : "",
    opts.product ? `RELATED PRODUCT (context only): ${opts.product}` : "",
    "",
    "═══ DOCUMENT TEXT ═══",
    text.slice(0, 20000),
    "═══ END ═══",
    "",
    "Produce the JSON now.",
  ].filter(Boolean).join("\n");
}

async function callOpenAI(system: string, user: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model: process.env.OPENAI_GENERATE_MODEL || "gpt-4o",
    max_completion_tokens: 8000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content || "";
}

async function callAnthropic(system: string, user: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: PROPOSAL_MODEL,
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: user }],
  });
  return res.content
    .map((c) => ((c as { type?: string; text?: string }).type === "text" ? (c as { text?: string }).text || "" : ""))
    .join("");
}

async function callGemini(system: string, user: string): Promise<string> {
  let out = "";
  await streamGeminiMessages(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    (d) => { out += d; },
  );
  return out;
}

// Tolerant JSON parse: strips code fences and grabs the outermost {…} object.
function parseJson(raw: string): InceptionDistillation {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  const obj = JSON.parse(s) as Partial<InceptionDistillation>;

  const sections: InceptionSection[] = Array.isArray(obj.sections)
    ? obj.sections
        .filter((x) => x && typeof x.title === "string" && typeof x.content === "string")
        .map((x) => ({
          title: String(x.title).slice(0, 160),
          tags: Array.isArray(x.tags) ? x.tags.map(String).slice(0, 6) : [],
          content: String(x.content),
        }))
    : [];

  const curation: InceptionCuration[] = Array.isArray(obj.curation)
    ? obj.curation
        .filter((x) => x && typeof x.title === "string" && typeof x.content === "string")
        .map((x) => {
          const kind = x.kind === "boilerplate" || x.kind === "proof_point" ? x.kind : "best_practice";
          const docTypes = (Array.isArray(x.docTypes) ? x.docTypes.map(String) : [])
            .filter((d) => ALLOWED_DOCTYPES.includes(d));
          return {
            kind,
            title: String(x.title).slice(0, 160),
            content: String(x.content),
            docTypes: docTypes.length ? docTypes : DEFAULT_DOCTYPES,
          };
        })
    : [];

  return { sections, curation };
}

// Distill an inception report into KB sections + curation entries.
// `demo` (Demo mode) routes through OpenAI; otherwise Anthropic, with Gemini as
// a fallback if neither key is present.
export async function distillInception(
  text: string,
  opts: { docTitle: string; state?: string; product?: string },
  demo = false,
): Promise<InceptionDistillation> {
  const user = buildUser(text, opts);
  let raw: string;
  if (demo && process.env.OPENAI_API_KEY) {
    raw = await callOpenAI(SYSTEM, user);
  } else if (process.env.ANTHROPIC_API_KEY) {
    raw = await callAnthropic(SYSTEM, user);
  } else if (process.env.OPENAI_API_KEY) {
    raw = await callOpenAI(SYSTEM, user);
  } else if (geminiConfigured()) {
    raw = await callGemini(SYSTEM, user);
  } else {
    throw new Error("No model key configured (set OPENAI_API_KEY or ANTHROPIC_API_KEY).");
  }
  const result = parseJson(raw);
  if (!result.sections.length && !result.curation.length) {
    throw new Error("The distiller returned nothing usable — try again.");
  }
  return result;
}
