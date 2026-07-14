import { auth } from "@/lib/auth";
import { extractRfpText } from "@/lib/rfp";
import { anthropic } from "@/lib/anthropic";
import { STATES } from "@/config/orgs";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;
const DOCTYPES = ["pab-note", "rfp-response", "proposal", "exec-summary", "concept-note"];
// Optimised: only the first ~2 pages go to a small/cheap model with tiny JSON out.
const HEAD_CHARS = 6000;

const SYSTEM = [
  "You read the first 1-2 pages of a ConveGenius pre-sales document and extract metadata.",
  "Return STRICT JSON only — no prose, no code fences — exactly:",
  '{"doctype": string, "title": string, "state": string, "tags": string[]}',
  `- doctype: the single best of ${DOCTYPES.join(" | ")}.`,
  "- title: a short human title naming the programme/tender/product (<= 80 chars).",
  "- state: the Indian state/UT the document concerns, matched EXACTLY to the provided options, or \"\" if none.",
  "- tags: 3-6 short lowercase keywords (schemes, product, theme).",
  "Output ONLY the JSON object.",
].join("\n");

function parseOut(raw: string): { doctype: string; title: string; state: string; tags: string[] } {
  let s = (raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  const o = JSON.parse(s) as Record<string, unknown>;
  const doctype = DOCTYPES.includes(String(o.doctype)) ? String(o.doctype) : "proposal";
  const stateRaw = String(o.state || "").trim();
  const state = STATES.includes(stateRaw) ? stateRaw : "";
  const title = String(o.title || "").trim().slice(0, 120);
  const tags = Array.isArray(o.tags) ? o.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 6) : [];
  return { doctype, title, state, tags };
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const OpenAI = (await import("openai")).default; // DEMO-ONLY path
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model: process.env.OPENAI_AUTOFILL_MODEL || "gpt-4o-mini",
    max_completion_tokens: 400,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
  });
  return res.choices[0]?.message?.content || "";
}

async function callAnthropic(system: string, user: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5", // small/cheap tier — enough for metadata extraction
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: user }],
  });
  return res.content.map((c) => ((c as { type?: string; text?: string }).type === "text" ? (c as { text?: string }).text || "" : "")).join("");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  if (!hasAnthropic && !hasOpenAI) return Response.json({ error: "No model key configured." }, { status: 501 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file uploaded" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File too large (max 25 MB)." }, { status: 413 });

  let text = "";
  try {
    text = (await extractRfpText(Buffer.from(await file.arrayBuffer()), file.name)).text;
  } catch {
    text = "";
  }
  if (!text || text.length < 40) {
    // Can't read (scanned PDF) — return an empty suggestion; the user fills manually.
    return Response.json({ doctype: "", title: file.name.replace(/\.[^.]+$/, ""), state: "", tags: [] });
  }

  const user = [
    `STATE OPTIONS (choose an exact match or ""): ${STATES.join(", ")}`,
    "",
    "DOCUMENT (first pages):",
    text.slice(0, HEAD_CHARS),
    "",
    "Return the JSON now.",
  ].join("\n");

  try {
    const raw = hasAnthropic ? await callAnthropic(SYSTEM, user) : await callOpenAI(SYSTEM, user);
    return Response.json(parseOut(raw));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Autofill failed" }, { status: 500 });
  }
}
