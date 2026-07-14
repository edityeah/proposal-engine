import { auth } from "@/lib/auth";
import { listProposals, historyMetrics, latestVersions, createProposal } from "@/lib/db/queries";

export const runtime = "nodejs";

// Persist the current document as a saved proposal (draft) so it appears in "My
// docs". Used by "Save to My Docs" when a generated doc has no id yet (e.g. a
// template-mode draft produced without an AI key). Mirrors the fields
// /api/generate sets, but with the already-written output.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    output?: string;
    inputs?: Record<string, unknown>;
  };
  const inp = body.inputs ?? {};
  const s = (k: string) => (typeof inp[k] === "string" ? (inp[k] as string) : undefined);
  const proposal = await createProposal({
    userId: session.user.id,
    title: body.title?.trim() || "Untitled document",
    productId: s("productId"),
    productName: s("productName"),
    generatorId: s("generatorId"),
    generatorLabel: s("generatorLabel"),
    proposalType: s("proposalType"),
    state: s("state"),
    org: s("org"),
    inputs: inp,
    output: body.output ?? "",
    model: "manual",
    status: "draft",
  });
  return Response.json({ id: proposal.id });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const u = session.user as { role?: string; state?: string | null };
  const scope = { role: u.role ?? "operator", state: u.state ?? null };
  const [proposals, metrics, versions] = await Promise.all([
    listProposals(100, scope),
    historyMetrics(scope),
    latestVersions(),
  ]);
  const versionById = new Map(versions.map((v) => [v.id, Number(v.version)]));
  const withVersion = proposals.map((p) => ({ ...p, version: versionById.get(p.id) ?? 1 }));
  return Response.json({ proposals: withVersion, metrics });
}
