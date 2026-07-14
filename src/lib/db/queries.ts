import { randomUUID } from "node:crypto";
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

// Latest version number per proposal (max of proposal_version.version), for the
// "v{n}" badge on the Recents cards.
export async function latestVersions() {
  return db
    .select({ id: proposalVersions.proposalId, version: sql<number>`max(${proposalVersions.version})` })
    .from(proposalVersions)
    .groupBy(proposalVersions.proposalId);
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

// Set the outcome status together with a mandatory reason. The reason is stored
// in the existing `inputs` jsonb (no schema change) so it travels with the row.
export async function setOutcome(id: string, status: string, reason: string) {
  const [row] = await db
    .select({ inputs: proposals.inputs })
    .from(proposals)
    .where(eq(proposals.id, id));
  const inputs = { ...(row?.inputs ?? {}), outcomeReason: reason };
  await db
    .update(proposals)
    .set({ status, inputs, updatedAt: new Date() })
    .where(eq(proposals.id, id));
}

// ── Document comments (Google-Docs style) ──
// Stored in the existing `inputs` jsonb (no schema change), same pattern as
// setOutcome. Visible to anyone who can open the proposal.
export interface ProposalComment {
  id: string;
  authorId: string;
  authorName: string;
  forId: string | null;    // teammate the comment is addressed to
  forName: string | null;
  quote: string;           // the selected text the comment anchors to
  body: string;
  resolved: boolean;
  createdAt: string;       // ISO
}

export async function listProposalComments(id: string): Promise<ProposalComment[]> {
  const [row] = await db.select({ inputs: proposals.inputs }).from(proposals).where(eq(proposals.id, id));
  if (!row) return [];
  const arr = (row.inputs as { comments?: ProposalComment[] } | null)?.comments;
  return Array.isArray(arr) ? arr : [];
}

async function writeComments(id: string, comments: ProposalComment[]): Promise<boolean> {
  const [row] = await db.select({ inputs: proposals.inputs }).from(proposals).where(eq(proposals.id, id));
  if (!row) return false;
  const inputs = { ...((row.inputs as Record<string, unknown>) ?? {}), comments };
  await db.update(proposals).set({ inputs, updatedAt: new Date() }).where(eq(proposals.id, id));
  return true;
}

export async function addProposalComment(
  id: string,
  c: { authorId: string; authorName: string; forId: string | null; forName: string | null; quote: string; body: string },
): Promise<ProposalComment | null> {
  const comments = await listProposalComments(id);
  const comment: ProposalComment = { ...c, id: randomUUID(), resolved: false, createdAt: new Date().toISOString() };
  const ok = await writeComments(id, [...comments, comment]);
  return ok ? comment : null;
}

export async function updateProposalComment(
  id: string,
  cid: string,
  patch: Partial<Pick<ProposalComment, "resolved" | "body">>,
): Promise<boolean> {
  const comments = await listProposalComments(id);
  let found = false;
  const next = comments.map((c) => (c.id === cid ? ((found = true), { ...c, ...patch }) : c));
  return found ? writeComments(id, next) : false;
}

export async function deleteProposalComment(id: string, cid: string): Promise<boolean> {
  const comments = await listProposalComments(id);
  const next = comments.filter((c) => c.id !== cid);
  return next.length === comments.length ? false : writeComments(id, next);
}

// Star / unstar a document. Stored in the `inputs` jsonb (no schema change).
// A star is a filter, not a folder — the doc still appears in All.
export async function setProposalStar(id: string, starred: boolean): Promise<boolean> {
  const [row] = await db.select({ inputs: proposals.inputs }).from(proposals).where(eq(proposals.id, id));
  if (!row) return false;
  const inputs = { ...((row.inputs as Record<string, unknown>) ?? {}), starred };
  await db.update(proposals).set({ inputs }).where(eq(proposals.id, id));
  return true;
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

  // Last 6 months (oldest → newest) for the trend charts, keyed off createdAt.
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: MON[d.getMonth()],
      total: 0, won: 0, lost: 0, inReview: 0, winRate: 0,
    };
  });
  const mIdx = new Map(monthly.map((m, i) => [m.key, i]));
  for (const r of rows) {
    if (!r.createdAt) continue;
    const d = new Date(r.createdAt);
    const i = mIdx.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    if (i === undefined) continue;
    const m = monthly[i];
    m.total += 1;
    if (r.status === "won") m.won += 1;
    else if (r.status === "lost") m.lost += 1;
    else if (r.status === "in_review") m.inReview += 1;
  }
  for (const m of monthly) {
    const dec = m.won + m.lost;
    m.winRate = dec ? Math.round((m.won / dec) * 100) : 0;
  }

  return {
    totals: { total, won, lost, winRate, inReview: rows.filter((r) => r.status === "in_review").length },
    byState: tally("state"),
    byProduct: tally("productName"),
    byGenerator: tally("generatorLabel"),
    monthly,
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
