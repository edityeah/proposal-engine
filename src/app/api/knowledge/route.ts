import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { extractRfpText } from "@/lib/rfp";
import { addKnowledge, listKnowledge } from "@/lib/db/knowledge";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;
const KINDS = new Set(["winning_proposal", "rfp", "sop", "exhibit", "toc"]);

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const kind = new URL(req.url).searchParams.get("kind") || undefined;
  const docs = await listKnowledge(kind && KINDS.has(kind) ? kind : undefined);
  return Response.json({ docs });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "");
  const title = String(form.get("title") || "").trim();
  const state = String(form.get("state") || "") || null;
  const tags = String(form.get("tags") || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!(file instanceof File)) return Response.json({ error: "No file uploaded" }, { status: 400 });
  if (!KINDS.has(kind)) return Response.json({ error: "Invalid document kind" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "File too large (max 25 MB)." }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let extracted = { text: "", words: 0 };
  try {
    extracted = await extractRfpText(buffer, file.name);
  } catch {
    // Non-fatal — store the file even if we can't extract text (e.g. scanned PDF).
    extracted = { text: "", words: 0 };
  }

  let blobUrl: string | null = null;
  try {
    const blob = await put(`knowledge/${kind}/${Date.now()}-${file.name}`, buffer, {
      access: "public",
      addRandomSuffix: true,
    });
    blobUrl = blob.url;
  } catch {
    blobUrl = null;
  }

  const row = await addKnowledge({
    uploadedBy: session.user.id,
    kind,
    title: title || file.name,
    state,
    tags,
    blobUrl,
    filename: file.name,
    text: extracted.text,
    words: extracted.words,
  });

  return Response.json({ doc: row });
}
