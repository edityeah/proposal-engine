import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  proposals,
  proposalVersions,
  type NewProposal,
} from "./schema";

export async function createProposal(data: NewProposal) {
  const [row] = await db.insert(proposals).values(data).returning();
  await db.insert(proposalVersions).values({
    proposalId: row.id,
    version: 1,
    content: row.output,
    label: "Initial draft",
  });
  return row;
}

export async function finalizeProposalOutput(id: string, output: string) {
  await db
    .update(proposals)
    .set({ output, updatedAt: new Date() })
    .where(eq(proposals.id, id));
  // Backfill version 1 content (the row was created before streaming finished).
  await db
    .update(proposalVersions)
    .set({ content: output })
    .where(and(eq(proposalVersions.proposalId, id), eq(proposalVersions.version, 1)));
}

export async function getProposal(id: string) {
  const [row] = await db.select().from(proposals).where(eq(proposals.id, id));
  return row ?? null;
}

export interface Scope {
  role: string;
  state: string | null;
}
// Operators with an assigned state see only that state; admins (and unassigned
// operators) see everything.
function scoped(s?: Scope): boolean {
  return !!s && s.role !== "admin" && !!s.state;
}

// History, optionally scoped to the viewer's state. Newest first.
export async function listProposals(limit = 100, s?: Scope) {
  if (scoped(s)) {
    return db.select().from(proposals).where(eq(proposals.state, s!.state!))
      .orderBy(desc(proposals.createdAt)).limit(limit);
  }
  return db.select().from(proposals).orderBy(desc(proposals.createdAt)).limit(limit);
}

export async function getVersions(proposalId: string) {
  return db
    .select()
    .from(proposalVersions)
    .where(eq(proposalVersions.proposalId, proposalId))
    .orderBy(desc(proposalVersions.version));
}

export async function addVersion(
  proposalId: string,
  content: string,
  label: string,
) {
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${proposalVersions.version}), 0) + 1` })
    .from(proposalVersions)
    .where(eq(proposalVersions.proposalId, proposalId));
  await db.insert(proposalVersions).values({
    proposalId,
    version: next,
    content,
    label,
  });
  await db
    .update(proposals)
    .set({ output: content, updatedAt: new Date() })
    .where(eq(proposals.id, proposalId));
  return next;
}

export async function setStatus(id: string, status: string) {
  await db
    .update(proposals)
    .set({ status, updatedAt: new Date() })
    .where(eq(proposals.id, id));
}

export async function getVersion(proposalId: string, version: number) {
  const [row] = await db
    .select()
    .from(proposalVersions)
    .where(and(eq(proposalVersions.proposalId, proposalId), eq(proposalVersions.version, version)));
  return row ?? null;
}

export async function analytics(s?: Scope) {
  const base = db
    .select({
      status: proposals.status,
      state: proposals.state,
      productName: proposals.productName,
      generatorLabel: proposals.generatorLabel,
      createdAt: proposals.createdAt,
    })
    .from(proposals);
  const rows = await (scoped(s) ? base.where(eq(proposals.state, s!.state!)) : base);

  const total = rows.length;
  const won = rows.filter((r) => r.status === "won").length;
  const lost = rows.filter((r) => r.status === "lost").length;
  const decided = won + lost;
  const winRate = decided ? Math.round((won / decided) * 100) : 0;

  const tally = (key: "state" | "productName" | "generatorLabel") => {
    const m = new Map<string, { total: number; won: number }>();
    for (const r of rows) {
      const k = (r[key] as string) || "—";
      const e = m.get(k) || { total: 0, won: 0 };
      e.total += 1;
      if (r.status === "won") e.won += 1;
      m.set(k, e);
    }
    return [...m.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  };

  return {
    totals: { total, won, lost, winRate, inReview: rows.filter((r) => r.status === "in_review").length },
    byState: tally("state"),
    byProduct: tally("productName"),
    byGenerator: tally("generatorLabel"),
  };
}

export async function historyMetrics(s?: Scope) {
  const base = db.select({ status: proposals.status, state: proposals.state }).from(proposals);
  const rows = await (scoped(s) ? base.where(eq(proposals.state, s!.state!)) : base);
  const total = rows.length;
  const won = rows.filter((r) => r.status === "won").length;
  const inReview = rows.filter((r) => r.status === "in_review").length;
  const states = new Set(rows.map((r) => r.state).filter(Boolean)).size;
  return { total, won, inReview, states };
}
