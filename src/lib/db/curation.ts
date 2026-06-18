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
