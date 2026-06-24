import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { renderDeckPptx, type DeckSpec } from "./deck";

const SAMPLE: DeckSpec = {
  title: "SwiftChat for Government Schools",
  subtitle: "AI-powered learning that reaches every child, in every classroom",
  slides: [
    {
      heading: "The challenge",
      bullets: [
        "Millions of students lack access to personalised support",
        "Teachers are stretched across large, multi-grade classrooms",
        "Existing tools rarely work on low-end phones or in local languages",
      ],
      note: "Open with the access gap.",
    },
    {
      heading: "What SwiftChat delivers",
      bullets: [
        "Conversational learning on WhatsApp — no app install needed",
        "Curriculum-aligned content in regional languages",
        "Real-time insights for teachers and administrators",
      ],
    },
    {
      heading: "Proven at scale",
      bullets: [
        "Trusted across 15+ Indian states",
        "Designed for the lowest-bandwidth conditions",
        "Recognised as Best AI App on Google Play 2023",
      ],
    },
  ],
  closing: {
    headline: "Let's bring SwiftChat to your state",
    cta: "Reach out to the ConveGenius team to start a pilot",
  },
};

function isValidPptx(buf: Buffer): boolean {
  // PPTX is a ZIP (PK\x03\x04) and must contain the presentation part.
  const zipMagic = buf[0] === 0x50 && buf[1] === 0x4b;
  const hasPresentation = buf.includes(Buffer.from("ppt/presentation.xml"));
  return zipMagic && hasPresentation;
}

describe("renderDeckPptx", () => {
  it("renders a valid, non-trivial .pptx for SwiftChat", async () => {
    const buf = await renderDeckPptx(SAMPLE, "swiftchat");
    expect(isValidPptx(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(20_000);
    fs.writeFileSync(path.join(os.tmpdir(), "deck-swiftchat.pptx"), buf);
  });

  it("renders a valid .pptx for ConveGenius (with embedded logo)", async () => {
    const buf = await renderDeckPptx({ ...SAMPLE, title: "ConveGenius Swiftverse" }, "convegenius");
    expect(isValidPptx(buf)).toBe(true);
    // ConveGenius brand carries a logo asset — embedding it should add a media part.
    expect(buf.includes(Buffer.from("ppt/media/"))).toBe(true);
    fs.writeFileSync(path.join(os.tmpdir(), "deck-convegenius.pptx"), buf);
  });
});
