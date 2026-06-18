import { auth } from "@/lib/auth";
import { getProposal, addVersion } from "@/lib/db/queries";
import { getOverride } from "@/lib/db/knowledge";
import { streamProposal } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) return Response.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    instruction?: string;
    selection?: string;
  };
  const instruction = (body.instruction || "").trim();
  if (!instruction) {
    return Response.json({ error: "Provide a refinement instruction." }, { status: 400 });
  }

  const inputs = proposal.inputs as { systemPrompt?: string };
  const override = proposal.productId ? await getOverride("product", proposal.productId) : null;
  const system =
    override ||
    inputs.systemPrompt ||
    "You are an expert proposal writer for ConveGenius. Revise government education proposals on request.";

  const userPrompt = [
    "Here is the current draft of a document:",
    "",
    "═══ CURRENT DRAFT ═══",
    proposal.output,
    "═══ END DRAFT ═══",
    "",
    body.selection
      ? "The user has highlighted this section to revise:\n\n" +
        body.selection +
        "\n"
      : "",
    "REFINEMENT INSTRUCTION: " + instruction,
    "",
    "Return the COMPLETE revised document (not just the changed part), keeping all " +
      "other sections intact and preserving the original structure and formatting.",
  ]
    .filter(Boolean)
    .join("\n");

  const encoder = new TextEncoder();
  const label = "Refine: " + instruction.slice(0, 60);

  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        full = await streamProposal({
          system,
          user: userPrompt,
          onText: (delta) => controller.enqueue(encoder.encode(delta)),
        });
        await addVersion(id, full, label);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Refine failed";
        controller.enqueue(encoder.encode("\n\n[ERROR] " + msg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
