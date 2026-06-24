import fs from "node:fs";
import path from "node:path";
import pptxgen from "pptxgenjs";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import { BRANDS, type Brand } from "@/config/brand";

// ─────────────────────────────────────────────────────────────
// Marketing Engine — Product Distribution deck generator.
// Step 1: the model drafts a structured DeckSpec (tool-forced JSON).
// Step 2: pptxgenjs renders a real, brand-styled .pptx from that spec.
// ─────────────────────────────────────────────────────────────

export interface DeckSlide {
  heading: string;
  bullets: string[];
  note?: string; // speaker note
}
export interface DeckSpec {
  title: string;
  subtitle: string;
  slides: DeckSlide[];
  closing: { headline: string; cta: string };
}

export interface DeckBrief {
  brandId: Brand["id"];
  topic: string; // e.g. "SwiftChat for Government Schools"
  audience: string; // e.g. "State education department officials"
  keyPoints?: string; // optional bullets the user wants covered
  slideCount?: number; // target content slides (excl. title/closing)
}

const EMIT_DECK_TOOL = {
  name: "emit_deck",
  description: "Return the finished presentation deck as structured data.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Deck title for the cover slide" },
      subtitle: { type: "string", description: "One-line subtitle / value proposition" },
      slides: {
        type: "array",
        description: "Content slides in order",
        items: {
          type: "object",
          properties: {
            heading: { type: "string" },
            bullets: {
              type: "array",
              items: { type: "string" },
              description: "3-5 punchy bullets, each a full thought, no trailing punctuation",
            },
            note: { type: "string", description: "Optional speaker note" },
          },
          required: ["heading", "bullets"],
        },
      },
      closing: {
        type: "object",
        properties: {
          headline: { type: "string", description: "Closing headline / call to action" },
          cta: { type: "string", description: "Next-step line, e.g. contact or pilot offer" },
        },
        required: ["headline", "cta"],
      },
    },
    required: ["title", "subtitle", "slides", "closing"],
  },
};

// Drafts the deck content with Claude, grounded in the brand's tone + stats.
export async function generateDeckSpec(brief: DeckBrief): Promise<DeckSpec> {
  const brand = BRANDS[brief.brandId];
  const n = Math.min(Math.max(brief.slideCount ?? 6, 3), 10);

  const system = [
    `You are a senior marketing strategist at ConveGenius producing a polished product-distribution slide deck for the brand "${brand.name}".`,
    `Brand tone: ${brand.tone}`,
    `Brand tagline: "${brand.tagline}".`,
    `Proof points you may use (only if relevant and truthful): ${brand.stats.join("; ")}.`,
    "",
    "Write tight, confident, India-edtech marketing copy. Bullets are short and concrete — outcomes and capabilities, not fluff. No emojis. Indian English. Never invent statistics beyond the proof points provided.",
    `Produce exactly ${n} content slides plus the cover and closing. Call the emit_deck tool with the result — do not reply in prose.`,
  ].join("\n");

  const user = [
    `Topic: ${brief.topic}`,
    `Audience: ${brief.audience}`,
    brief.keyPoints ? `Must cover these points: ${brief.keyPoints}` : "",
    "",
    "Build a persuasive narrative: problem/context → what we offer → how it works → outcomes/proof → why us → call to action.",
  ]
    .filter(Boolean)
    .join("\n");

  const msg = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    system,
    tools: [EMIT_DECK_TOOL],
    tool_choice: { type: "tool", name: "emit_deck" },
    messages: [{ role: "user", content: user }],
  });

  const block = msg.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "emit_deck",
  );
  if (!block) throw new Error("Model did not return a deck spec.");
  const spec = block.input as DeckSpec;
  if (!spec.slides?.length) throw new Error("Deck spec had no slides.");
  return spec;
}

// ── Rendering ────────────────────────────────────────────────
const hex = (c: string) => c.replace("#", "").toUpperCase();

// Reads a /public asset into a base64 data URI so it embeds reliably at
// runtime regardless of working directory (and on serverless). Returns null
// if the file is absent so rendering degrades gracefully.
function logoDataUri(relPath?: string): string | null {
  if (!relPath) return null;
  try {
    const abs = path.join(process.cwd(), "public", relPath.replace(/^\//, ""));
    const buf = fs.readFileSync(abs);
    const ext = path.extname(abs).slice(1).toLowerCase();
    const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// Renders the DeckSpec into a real, brand-styled .pptx and returns the bytes.
export async function renderDeckPptx(spec: DeckSpec, brandId: Brand["id"]): Promise<Buffer> {
  const brand = BRANDS[brandId];
  const primary = hex(brand.colors.primary.hex);
  const ink = hex(brand.colors.ink.hex);
  const accent = hex(brand.colors.accents[0]?.hex ?? brand.colors.secondary.hex);
  const paper = hex(brand.colors.paper);
  const head = brand.fonts.heading;
  const body = brand.fonts.body;
  const logo = logoDataUri(brand.logo?.full);

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5in, 16:9
  pptx.author = "ConveGenius Engine";
  pptx.company = brand.name;
  pptx.title = spec.title;
  const W = 13.33;

  // ── Cover slide ──
  const cover = pptx.addSlide();
  cover.background = { color: paper };
  cover.addShape("rect", { x: 0, y: 0, w: W, h: 0.28, fill: { color: primary } });
  cover.addShape("rect", { x: 0, y: 7.22, w: W, h: 0.28, fill: { color: accent } });
  if (logo) cover.addImage({ data: logo, x: 0.6, y: 0.7, w: 2.6, h: 0.47 });
  cover.addText(spec.title, {
    x: 0.6, y: 2.4, w: 12.1, h: 1.8,
    fontSize: 40, bold: true, color: ink, fontFace: head, align: "left", valign: "top",
  });
  cover.addText(spec.subtitle, {
    x: 0.6, y: 4.2, w: 11, h: 1, fontSize: 20, color: primary, fontFace: body, align: "left",
  });
  cover.addText(brand.stats.join("   •   "), {
    x: 0.6, y: 6.5, w: 12.1, h: 0.5, fontSize: 12, color: ink, fontFace: body, align: "left",
  });

  // ── Content slides ──
  spec.slides.forEach((s, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: paper };
    slide.addShape("rect", { x: 0, y: 0, w: 0.22, h: 7.5, fill: { color: primary } });
    slide.addText(s.heading, {
      x: 0.7, y: 0.55, w: 11.9, h: 1, fontSize: 28, bold: true, color: ink, fontFace: head,
    });
    slide.addShape("rect", { x: 0.75, y: 1.55, w: 1.4, h: 0.06, fill: { color: accent } });
    slide.addText(
      s.bullets.map((b) => ({ text: b, options: { bullet: { code: "2022", indent: 18 } } })),
      {
        x: 0.75, y: 1.95, w: 11.8, h: 4.6, fontSize: 18, color: ink, fontFace: body,
        lineSpacingMultiple: 1.3, valign: "top",
      },
    );
    if (logo) slide.addImage({ data: logo, x: 10.9, y: 6.85, w: 1.8, h: 0.32 });
    slide.addText(`${i + 1}`, {
      x: 0.3, y: 6.9, w: 0.5, h: 0.3, fontSize: 11, color: primary, fontFace: body, align: "center",
    });
    if (s.note) slide.addNotes(s.note);
  });

  // ── Closing slide ──
  const close = pptx.addSlide();
  close.background = { color: primary };
  close.addText(spec.closing.headline, {
    x: 0.8, y: 2.6, w: 11.7, h: 1.6, fontSize: 34, bold: true, color: "FFFFFF", fontFace: head, valign: "top",
  });
  close.addText(spec.closing.cta, {
    x: 0.8, y: 4.3, w: 11.7, h: 1, fontSize: 20, color: "FFFFFF", fontFace: body,
  });
  close.addText(brand.tagline, {
    x: 0.8, y: 6.6, w: 11.7, h: 0.5, fontSize: 14, italic: true, color: "FFFFFF", fontFace: body,
  });

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}
