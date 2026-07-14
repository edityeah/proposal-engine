import { auth } from "@/lib/auth";
import { enhanceSelection } from "@/lib/anthropic";

export const runtime = "nodejs";

// Rewrite a highlighted snippet (Enhance / Concise / Formal, or a free-text ask)
// and return the revised text; the editor swaps it into the selected range.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { instruction?: string; selection?: string };
  const instruction = (b.instruction || "").trim();
  const selection = (b.selection || "").trim();
  if (!instruction || !selection) return Response.json({ error: "instruction and selection required" }, { status: 400 });
  try {
    const text = await enhanceSelection(instruction, selection);
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Enhance failed" }, { status: 500 });
  }
}
