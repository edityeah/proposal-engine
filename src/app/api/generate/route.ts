import { auth } from "@/lib/auth";
import { buildUserPrompt, validateInputs, type GenerateInputs } from "@/lib/prompt";
import { streamProposal, PROPOSAL_MODEL } from "@/lib/anthropic";
import { createProposal, finalizeProposalOutput } from "@/lib/db/queries";
import { getOverride, retrieveContext } from "@/lib/db/knowledge";
import { buildRetrievalBlock } from "@/lib/retrieval";
import { computeCm2 } from "@/lib/costing";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let inputs: GenerateInputs;
  try {
    inputs = (await req.json()) as GenerateInputs;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const err = validateInputs(inputs);
  if (err) return Response.json({ error: err }, { status: 400 });

  // Phase 2: apply admin prompt overrides (server-side, authoritative).
  const productOverride = inputs.productId ? await getOverride("product", inputs.productId) : null;
  const generatorOverride = (inputs as { generatorId?: string }).generatorId
    ? await getOverride("generator", (inputs as { generatorId?: string }).generatorId!)
    : null;
  const systemPrompt = productOverride || inputs.systemPrompt;
  if (generatorOverride) inputs.generatorPrefix = generatorOverride;

  let userPrompt = buildUserPrompt(inputs);

  // Phase 3: ground in relevant past material (RAG).
  try {
    const keywords = [
      inputs.department,
      inputs.productName,
      ...(inputs.selectedModuleNames ?? []),
      ...(inputs.context ? inputs.context.split(/\s+/).slice(0, 30) : []),
    ].filter(Boolean) as string[];
    const ctx = await retrieveContext({ state: inputs.state, keywords });
    const block = buildRetrievalBlock(ctx);
    if (block) userPrompt += block;
  } catch {
    // retrieval is best-effort — never block generation on it.
  }

  // CM2 numbers are INTERNAL — only feed them to the finance memo generator,
  // never to client-facing proposal documents.
  if ((inputs as { generatorId?: string }).generatorId === "cm2_analysis") {
    const years = parseDurationYears(inputs.duration);
    const cm2 = computeCm2({
      budgetCr: toNum(inputs.budget),
      schools: toNum(inputs.schools),
      students: toNum(inputs.students),
      durationYears: years,
      viaPartner: !!inputs.implementingPartner && inputs.implementingPartner !== "",
    });
    userPrompt +=
      "\n\n═══ AUTO-CALCULATED COSTING ESTIMATE (internal — use these figures as the model's baseline) ═══\n" +
      `Revenue${cm2.estimatedRevenue ? " (estimated from scale)" : ""}: ₹${cm2.revenueCr} Cr\n` +
      cm2.lines.map((l) => `- ${l.label}: ₹${l.amountCr} Cr`).join("\n") +
      `\nCM1: ₹${cm2.cm1Cr} Cr (${cm2.cm1Pct}%)\nOverheads: ₹${cm2.overheadCr} Cr\n` +
      `CM2: ₹${cm2.cm2Cr} Cr (${cm2.cm2Pct}%)` +
      (inputs.cm2 ? `\nTarget CM2: ${inputs.cm2}%` : "") +
      "\n═══ END COSTING ═══";
  }

  const title =
    (inputs.generatorLabel || "Document") + " — " + (inputs.productName || "") + " · " + (inputs.state || "");

  const proposal = await createProposal({
    userId: session.user.id,
    title,
    productId: inputs.productId,
    productName: inputs.productName,
    generatorId: (inputs as { generatorId?: string }).generatorId,
    generatorLabel: inputs.generatorLabel,
    proposalType: inputs.proposalType,
    state: inputs.state,
    org: inputs.org,
    inputs: inputs as unknown as Record<string, unknown>,
    rfpBlobUrl: (inputs as { rfpBlobUrl?: string }).rfpBlobUrl ?? null,
    rfpFilename: (inputs as { rfpFilename?: string }).rfpFilename ?? null,
    output: "",
    model: PROPOSAL_MODEL,
    status: "draft",
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        full = await streamProposal({
          system: systemPrompt,
          user: userPrompt,
          onText: (delta) => controller.enqueue(encoder.encode(delta)),
        });
        await finalizeProposalOutput(proposal.id, full);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Generation failed";
        controller.enqueue(encoder.encode("\n\n[ERROR] " + msg));
        if (full) await finalizeProposalOutput(proposal.id, full).catch(() => {});
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Proposal-Id": proposal.id,
    },
  });
}

function toNum(v: string | undefined): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseDurationYears(d: string | undefined): number | undefined {
  if (!d) return undefined;
  const m = /(\d+)\s*year/i.exec(d);
  return m ? Number(m[1]) : undefined;
}
