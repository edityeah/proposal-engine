import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { curationEntries, type CurationEntry } from "./schema";

export async function listCuration() {
  return db
    .select()
    .from(curationEntries)
    .where(eq(curationEntries.status, "active"))
    .orderBy(desc(curationEntries.updatedAt));
}

export async function createCuration(data: {
  kind: string;
  title: string;
  content: string;
  tags?: string[];
  docTypes?: string[];
  products?: string[];
  state?: string | null;
  updatedBy: string;
}) {
  const [row] = await db.insert(curationEntries).values(data).returning();
  return row;
}

export async function updateCuration(
  id: string,
  data: Partial<Pick<CurationEntry, "title" | "content" | "kind" | "tags" | "docTypes" | "products" | "state" | "enabled">>,
  updatedBy: string,
) {
  await db
    .update(curationEntries)
    .set({ ...data, updatedBy, updatedAt: new Date() })
    .where(eq(curationEntries.id, id));
}

export async function archiveCuration(id: string) {
  await db
    .update(curationEntries)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(curationEntries.id, id));
}

// Returns enabled, active entries relevant to a generation. Scope rule:
// empty docTypes/products = applies to all; state null = all states.
export async function curationForGeneration(opts: {
  generatorId?: string;
  productId?: string;
  state?: string;
}): Promise<CurationEntry[]> {
  const rows = await db
    .select()
    .from(curationEntries)
    .where(and(eq(curationEntries.status, "active"), eq(curationEntries.enabled, 1)));
  return rows.filter((e) => matchesScope(e, opts));
}

// A fixed set of PAB-scoped guidance (patterns, not fabricated figures). Seeded
// idempotently — skipped if an entry with the same title already exists — so an
// admin can one-click strengthen every PAB note, then edit/toggle in the Studio.
const PAB_SEED: { kind: string; title: string; content: string }[] = [
  {
    kind: "best_practice",
    title: "PAB costing table structure",
    content:
      "Present financials as a table. Every line resolves as: component → physical units → unit cost → total → amount (₹ lakhs) → tagged Recurring (R) / Non-Recurring (NR) → mapped to a PAB head (Quality Intervention, Teacher Education, Assessment Reform, FLN/Assessment, PM SHRI, HPC). Show year-wise phasing and a grand total. Never fabricate a rate — use [INSERT: unit cost for <component>]; a cost with no head is incomplete, flag it rather than guess.",
  },
  {
    kind: "best_practice",
    title: "Cite every statistic with source + year",
    content:
      "Every learning/access figure carries its source and year (e.g. NAS 2021, PARAKH 2024, UDISE+ 2023–24). If a figure isn't supplied, write [INSERT: … , source + year] — never round or invent a number.",
  },
  {
    kind: "best_practice",
    title: "Show convergence, not duplication",
    content:
      "Map the ask to existing funded lines (NIPUN Bharat, PM POSHAN, STARS, PM SHRI, relevant state schemes) and state explicitly how this intervention converges with them rather than duplicating funded activity.",
  },
  {
    kind: "boilerplate",
    title: "PAB note section order",
    content:
      "State & programme overview → gap analysis (quantified, cited) → proposed intervention & rationale (theory of change) → physical targets (year-wise) → component-wise financials (costing table, R/NR, PAB head) → implementation plan & timeline → expected outcomes & monitoring (each KPI tied to the spend it justifies) → convergence with other schemes.",
  },
];

export async function seedPabCuration(updatedBy: string): Promise<number> {
  const existing = await db
    .select({ title: curationEntries.title })
    .from(curationEntries)
    .where(eq(curationEntries.status, "active"));
  const have = new Set(existing.map((e) => e.title));
  let created = 0;
  for (const e of PAB_SEED) {
    if (have.has(e.title)) continue;
    await createCuration({
      kind: e.kind,
      title: e.title,
      content: e.content,
      tags: ["pab", "seed"],
      docTypes: ["pab_note"],
      products: [],
      state: null,
      updatedBy,
    });
    created++;
  }
  return created;
}

export function matchesScope(
  e: Pick<CurationEntry, "docTypes" | "products" | "state">,
  opts: { generatorId?: string; productId?: string; state?: string },
): boolean {
  const dt = e.docTypes ?? [];
  const pr = e.products ?? [];
  if (dt.length && opts.generatorId && !dt.includes(opts.generatorId)) return false;
  if (pr.length && opts.productId && !pr.includes(opts.productId)) return false;
  if (e.state && opts.state && e.state !== opts.state) return false;
  return true;
}
