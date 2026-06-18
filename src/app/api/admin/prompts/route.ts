import { auth } from "@/lib/auth";
import { listOverrides, setOverride } from "@/lib/db/knowledge";
import { PRODUCTS } from "@/data/products";
import { GENERATORS } from "@/data/generators";

export const runtime = "nodejs";

// Returns the editable catalogue (products + generators) merged with any saved
// overrides, so the admin UI shows the effective prompt for each.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const overrides = await listOverrides();
  const byKey = new Map(overrides.map((o) => [o.refType + ":" + o.refId, o.content]));

  const products = PRODUCTS.filter((p) => p.systemPrompt).map((p) => ({
    refType: "product",
    refId: p.id,
    name: p.name,
    base: p.systemPrompt as string,
    override: byKey.get("product:" + p.id) ?? null,
  }));
  const generators = GENERATORS.map((g) => ({
    refType: "generator",
    refId: g.id,
    name: g.label,
    base: g.promptPrefix as string,
    override: byKey.get("generator:" + g.id) ?? null,
  }));

  return Response.json({ products, generators });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    refType?: string;
    refId?: string;
    content?: string;
  };
  if (!body.refType || !body.refId || typeof body.content !== "string") {
    return Response.json({ error: "refType, refId and content are required" }, { status: 400 });
  }
  if (!["product", "generator"].includes(body.refType)) {
    return Response.json({ error: "Invalid refType" }, { status: 400 });
  }
  await setOverride(body.refType, body.refId, body.content, session.user.id);
  return Response.json({ ok: true });
}
