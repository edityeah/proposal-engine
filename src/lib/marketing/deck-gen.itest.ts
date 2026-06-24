import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateDeckSpec, renderDeckPptx } from "./deck";

// Integration: hits the real Anthropic API. Run with env loaded:
//   set -a && . ./.env.local && set +a && npx vitest run src/lib/marketing/deck-gen.itest.ts
describe("generateDeckSpec (live)", () => {
  it("drafts a structured deck spec and renders it", async () => {
    const spec = await generateDeckSpec({
      brandId: "swiftchat",
      topic: "SwiftChat for Government Schools in Uttar Pradesh",
      audience: "State education department officials",
      keyPoints: "WhatsApp-based, regional languages, teacher dashboards, NIPUN alignment",
      slideCount: 6,
    });

    expect(spec.title).toBeTruthy();
    expect(spec.subtitle).toBeTruthy();
    expect(spec.slides.length).toBeGreaterThanOrEqual(4);
    expect(spec.slides.every((s) => s.heading && s.bullets.length >= 2)).toBe(true);
    expect(spec.closing.headline).toBeTruthy();

    const buf = await renderDeckPptx(spec, "swiftchat");
    expect(buf[0]).toBe(0x50);
    fs.writeFileSync(path.join(os.tmpdir(), "deck-live.pptx"), buf);
    console.log("LIVE DECK:", JSON.stringify({ title: spec.title, slides: spec.slides.map((s) => s.heading) }, null, 2));
  }, 90_000);
});
