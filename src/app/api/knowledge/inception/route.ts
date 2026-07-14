import { auth } from "@/lib/auth";
import { extractRfpText } from "@/lib/rfp";
import { distillInception } from "@/lib/inception";
import { addKnowledge } from "@/lib/db/knowledge";
import { createCuration } from "@/lib/db/curation";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 25 * 1024 * 1024;

// Ingest an inception report: extract text → distill into patterns → persist as
// section-level KB chunks (kind "inception", short enough to retrieve whole) plus
// scoped curation entries. Patterns only — no lifted specifics (see lib/inception).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const userId = session.user.id;

  const form = await req.formData();
  const file = form.get("file");
  const state = (String(form.get("state") || "").trim()) || null;
  const product = (String(form.get("product") || "").trim()) || undefined;
  const titleIn = String(form.get("title") || "").trim();

  if (!(file instanceof File)) return Response.json({ error: "No file uploaded" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File too large (max 25 MB)." }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let text = "";
  try {
    text = (await extractRfpText(buffer, file.name)).text;
  } catch {
    text = "";
  }
  if (!text || text.length < 100) {
    return Response.json({ error: "Couldn't read enough text from this file (a scanned PDF?)." }, { status: 422 });
  }

  const docTitle = titleIn || file.name.replace(/\.[^.]+$/, "");

  let distilled;
  try {
    distilled = await distillInception(text, { docTitle, state: state || undefined, product });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Distillation failed." }, { status: 500 });
  }

  // Persist section chunks (each short → retrieved whole, not truncated at 1500).
  let sections = 0;
  for (const s of distilled.sections) {
    await addKnowledge({
      uploadedBy: userId,
      kind: "inception",
      title: `${docTitle} — ${s.title}`,
      state,
      tags: ["inception", ...s.tags].slice(0, 8),
      text: s.content,
      words: s.content.split(/\s+/).filter(Boolean).length,
    });
    sections++;
  }

  // Persist curation entries — authoritative patterns, scoped to the doc types an
  // inception report legitimately strengthens (never cm2 / financial-only).
  let curation = 0;
  for (const c of distilled.curation) {
    await createCuration({
      kind: c.kind,
      title: `[Inception] ${c.title}`,
      content: c.content,
      tags: ["inception"],
      docTypes: c.docTypes,
      products: product ? [product] : [],
      state,
      updatedBy: userId,
    });
    curation++;
  }

  return Response.json({ ok: true, title: docTitle, sections, curation });
}
