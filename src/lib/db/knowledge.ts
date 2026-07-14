import { and, desc, eq, or, ilike } from "drizzle-orm";
import { db } from "./index";
import { knowledgeDocuments, promptOverrides } from "./schema";

export async function listKnowledge(kind?: string) {
  const where = kind
    ? and(eq(knowledgeDocuments.status, "active"), eq(knowledgeDocuments.kind, kind))
    : eq(knowledgeDocuments.status, "active");
  return db
    .select()
    .from(knowledgeDocuments)
    .where(where)
    .orderBy(desc(knowledgeDocuments.createdAt));
}

export async function addKnowledge(data: {
  uploadedBy: string;
  kind: string;
  title: string;
  state?: string | null;
  tags?: string[];
  blobUrl?: string | null;
  filename?: string | null;
  text: string;
  words: number;
}) {
  const [row] = await db.insert(knowledgeDocuments).values(data).returning();
  return row;
}

export async function archiveKnowledge(id: string) {
  await db
    .update(knowledgeDocuments)
    .set({ status: "archived" })
    .where(eq(knowledgeDocuments.id, id));
}

// ── Phase 3 retrieval (RAG) ──
// Naive but dependency-free relevance: prefer same-state docs and keyword/tag
// matches over title+text. Returns short excerpts to inject into the prompt.
export async function retrieveContext(opts: {
  state?: string;
  kinds?: string[];
  keywords?: string[];
  limit?: number;
}) {
  const { state, kinds = ["winning_proposal", "rfp", "sop", "inception"], keywords = [], limit = 4 } = opts;

  const kindFilter = or(...kinds.map((k) => eq(knowledgeDocuments.kind, k)));
  const kwFilters = keywords
    .filter((k) => k && k.length > 2)
    .slice(0, 6)
    .flatMap((k) => [ilike(knowledgeDocuments.title, `%${k}%`), ilike(knowledgeDocuments.text, `%${k}%`)]);

  const rows = await db
    .select()
    .from(knowledgeDocuments)
    .where(and(eq(knowledgeDocuments.status, "active"), kindFilter))
    .orderBy(desc(knowledgeDocuments.createdAt))
    .limit(40);

  // Score in JS: state match + keyword hits.
  const scored = rows
    .map((r) => {
      let score = 0;
      if (state && r.state && r.state === state) score += 5;
      const hay = (r.title + " " + r.text).toLowerCase();
      for (const k of keywords) {
        if (k && k.length > 2 && hay.includes(k.toLowerCase())) score += 1;
      }
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ r }) => ({
    kind: r.kind,
    title: r.title,
    state: r.state,
    excerpt: r.text.slice(0, 1500),
  }));
}

// ── Prompt overrides ──
export async function getOverride(refType: string, refId: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(promptOverrides)
    .where(and(eq(promptOverrides.refType, refType), eq(promptOverrides.refId, refId)));
  return row?.content ?? null;
}

export async function listOverrides() {
  return db.select().from(promptOverrides);
}

export async function setOverride(refType: string, refId: string, content: string, updatedBy: string) {
  await db
    .insert(promptOverrides)
    .values({ refType, refId, content, updatedBy, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [promptOverrides.refType, promptOverrides.refId],
      set: { content, updatedBy, updatedAt: new Date() },
    });
}
