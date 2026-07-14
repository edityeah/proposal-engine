import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { extractRfpText } from "@/lib/rfp";
import { addKnowledge } from "@/lib/db/knowledge";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  // Set by the Generate form's "Responding to an RFP?" upload, so the RFP is also
  // saved to the RFP library (the shared Co-Pilot/chat attach does not set it).
  const toLibrary = form.get("toLibrary") === "1";
  const state = String(form.get("state") || "") || null;
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File too large (max 25 MB)." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Extract text for grounding the prompt.
  let extracted;
  try {
    extracted = await extractRfpText(buffer, file.name);
  } catch {
    return Response.json(
      { error: "Could not read this file. Try a text-based PDF, .docx, or .txt." },
      { status: 422 },
    );
  }

  if (!extracted.text || extracted.text.length < 100) {
    return Response.json(
      {
        error:
          "Couldn't extract text (scanned/image PDF?). Paste the RFP into the Context field instead.",
      },
      { status: 422 },
    );
  }

  // Store the original document in Blob for the record.
  let blobUrl: string | null = null;
  try {
    const blob = await put(`rfps/${Date.now()}-${file.name}`, buffer, {
      access: "public",
      addRandomSuffix: true,
    });
    blobUrl = blob.url;
  } catch {
    // Non-fatal — extraction already succeeded; proceed without the stored copy.
    blobUrl = null;
  }

  // Also push it to the RFP library so it's browsable/reusable there.
  let libraryId: string | null = null;
  if (toLibrary) {
    try {
      const row = await addKnowledge({
        uploadedBy: session.user.id,
        kind: "rfp",
        title: file.name,
        state,
        tags: [],
        blobUrl,
        filename: file.name,
        text: extracted.text,
        words: extracted.words,
      });
      libraryId = row.id;
    } catch {
      // Non-fatal — the upload/extraction still succeeded; just skip the library copy.
      libraryId = null;
    }
  }

  return Response.json({
    text: extracted.text,
    words: extracted.words,
    filename: file.name,
    blobUrl,
    libraryId,
  });
}
