import { auth } from "@/lib/auth";
import { extractRfpText } from "@/lib/rfp";
import { streamProposal } from "@/lib/anthropic";
import { streamGeminiMessages, geminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 25 * 1024 * 1024;

const DOCTYPE_LABELS: Record<string, string> = {
  "pab-note": "PAB note",
  "rfp-response": "RFP response",
  "proposal": "Full proposal",
  "exec-summary": "Executive summary",
  "concept-note": "Concept note",
};

const DISTILL_SYSTEM = [
  'You are the ConveGenius Pre-Sales "distill" agent. You read ONE example proposal document and extract what a proposal-writing bot should LEARN from it, as a concise markdown note (knowledge.md).',
  "",
  "OUTPUT RULES:",
  "- Output ONLY the markdown. No preamble and no code fences around the whole note.",
  "- Capture PATTERNS, never copy a specific number, state, scheme, org or fact as content — describe the *move*, not the datum.",
  "- Unit costs / rates are reference-only: never present a rate as a value to reuse; where a figure would go, write a marked [INSERT: …] placeholder.",
  '- If the document\'s actual content does NOT match the stated document type, make the FIRST line a callout: "> ⚠ This reads like a <actual type>, not a <stated type> — consider re-tagging."',
  "",
  "STRUCTURE (use these headings):",
  "# knowledge.md — what I learned",
  "a bold Source / type / outcome line",
  "## Recurring section shape  (the sections in order, each with its one-line job)",
  "## DO — what won this one  (if WON)   /   ## AVOID — what cost this one  (if LOST)",
  "## Proof-point candidates *(verify before reuse)*",
  "## Figures not supplied → [INSERT: …] placeholders",
  "",
  "HOUSE STYLE to reinforce in the learnings: formal government-note register; quantified; evidence cited with source + year (NAS / PARAKH / UDISE+); every rupee mapped to a PAB head; never fabricate a figure.",
].join("\n");

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  // Provider: Claude by default; Gemini only as a last resort.
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  if (!hasAnthropic && !geminiConfigured()) {
    return Response.json(
      { error: "No model key set — add ANTHROPIC_API_KEY to .env.local to use the distill agent." },
      { status: 501 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const doctype = String(form.get("doctype") || "");
  const outcome = String(form.get("outcome") || "won") === "lost" ? "lost" : "won";

  if (!(file instanceof File)) return Response.json({ error: "No file uploaded" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File too large (max 25 MB)." }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    text = (await extractRfpText(buffer, file.name)).text;
  } catch {
    text = "";
  }
  if (!text) {
    return Response.json({ error: "Couldn't read any text from this file (a scanned PDF?)." }, { status: 422 });
  }

  const label = DOCTYPE_LABELS[doctype] || doctype || "proposal";
  const user = [
    `STATED DOCUMENT TYPE: ${label}`,
    `OUTCOME: ${outcome.toUpperCase()}`,
    `FILENAME: ${file.name}`,
    "",
    "═══ DOCUMENT TEXT ═══",
    text.slice(0, 20000),
    "═══ END ═══",
    "",
    "Produce knowledge.md now.",
  ].join("\n");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const onText = (d: string) => controller.enqueue(encoder.encode(d));
      try {
        if (hasAnthropic) {
          await streamProposal({ system: DISTILL_SYSTEM, user, onText });
        } else {
          await streamGeminiMessages(
            [
              { role: "system", content: DISTILL_SYSTEM },
              { role: "user", content: user },
            ],
            onText,
          );
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode("\n\n> ⚠ **Distill failed:** " + (e instanceof Error ? e.message : "unknown error")),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
