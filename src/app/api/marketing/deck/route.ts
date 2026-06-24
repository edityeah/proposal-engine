import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { BRANDS, type Brand } from "@/config/brand";
import {
  generateDeckSpec,
  renderDeckPptx,
  fetchLogoDataUri,
  type DeckBrief,
} from "@/lib/marketing/deck";
import { saveMarketingAsset, listMarketingAssets } from "@/lib/db/marketing";

export const runtime = "nodejs";
export const maxDuration = 300;

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "deck";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const u = session.user as { id: string; role?: string; state?: string | null };
  const assets = await listMarketingAssets(u.id, { role: u.role ?? "operator", state: u.state ?? null });
  return Response.json({ assets });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const u = session.user as { id: string; role?: string; state?: string | null };

  let body: Partial<DeckBrief>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const brandId = body.brandId as Brand["id"];
  if (!brandId || !BRANDS[brandId]) {
    return Response.json({ error: "Pick a valid brand." }, { status: 400 });
  }
  if (!body.topic || !body.audience) {
    return Response.json({ error: "Topic and audience are required." }, { status: 400 });
  }

  const brief: DeckBrief = {
    brandId,
    topic: String(body.topic),
    audience: String(body.audience),
    keyPoints: body.keyPoints ? String(body.keyPoints) : undefined,
    slideCount: body.slideCount ? Number(body.slideCount) : undefined,
  };

  // 1. Draft the deck content.
  let spec;
  try {
    spec = await generateDeckSpec(brief);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not draft the deck." },
      { status: 502 },
    );
  }

  // 2. Render the branded .pptx (resolve the logo over HTTP — serverless has no
  //    /public on disk).
  const origin = new URL(req.url).origin;
  const logoDataUri = await fetchLogoDataUri(brandId, origin);
  const buffer = await renderDeckPptx(spec, brandId, { logoDataUri });

  // 3. Store the file.
  const filename = `${slug(spec.title)}.pptx`;
  let blobUrl: string | null = null;
  try {
    const blob = await put(`marketing/decks/${Date.now()}-${filename}`, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    blobUrl = blob.url;
  } catch (e) {
    return Response.json(
      { error: "Rendered the deck but couldn't store it. Try again." + (e instanceof Error ? ` (${e.message})` : "") },
      { status: 502 },
    );
  }

  // 4. Save the record.
  const asset = await saveMarketingAsset({
    userId: u.id,
    brand: brandId,
    type: "deck",
    useCase: "product_distribution",
    title: spec.title,
    brief: brief as unknown as Record<string, unknown>,
    spec: spec as unknown as Record<string, unknown>,
    blobUrl,
    filename,
    model: "claude-opus-4-8",
    state: u.role === "admin" ? null : u.state ?? null,
  });

  return Response.json({
    assetId: asset.id,
    title: spec.title,
    filename,
    url: blobUrl,
    slides: spec.slides.length + 2,
  });
}
