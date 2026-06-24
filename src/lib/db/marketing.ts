import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { marketingAssets, type NewMarketingAsset } from "./schema";
import type { Scope } from "./queries";

export async function saveMarketingAsset(data: NewMarketingAsset) {
  const [row] = await db.insert(marketingAssets).values(data).returning();
  return row;
}

// Recent assets for the studio. Operators see only their state's assets (plus
// any with no state); admins see everything.
export async function listMarketingAssets(userId: string, scope?: Scope, limit = 30) {
  const rows = await db
    .select()
    .from(marketingAssets)
    .where(eq(marketingAssets.status, "ready"))
    .orderBy(desc(marketingAssets.createdAt))
    .limit(200);
  void userId;
  const filtered =
    scope && scope.role !== "admin" && scope.state
      ? rows.filter((r) => !r.state || r.state === scope.state)
      : rows;
  return filtered.slice(0, limit);
}

export async function getMarketingAsset(id: string) {
  const [row] = await db.select().from(marketingAssets).where(eq(marketingAssets.id, id));
  return row ?? null;
}

export async function archiveMarketingAsset(id: string, userId: string) {
  await db
    .update(marketingAssets)
    .set({ status: "archived" })
    .where(and(eq(marketingAssets.id, id), eq(marketingAssets.userId, userId)));
}
