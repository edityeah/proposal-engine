// One-shot integration self-test against the real Neon DB + a tiny live Claude
// call. Run explicitly (not part of `npm test`):
//   set -a && . ./.env.local && set +a && npx vitest run src/selftest.itest.ts --config vitest.selftest.config.ts
import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./lib/db";
import { proposals } from "./lib/db/schema";
import {
  createProposal,
  finalizeProposalOutput,
  getProposal,
  addVersion,
  getVersions,
  getVersion,
  analytics,
} from "./lib/db/queries";
import {
  addKnowledge,
  retrieveContext,
  setOverride,
  getOverride,
  archiveKnowledge,
} from "./lib/db/knowledge";
import { streamProposal } from "./lib/anthropic";
import { markdownToDocxBuffer } from "./lib/docx";
import { markdownToPdfBuffer } from "./lib/pdf";
import { computeCm2 } from "./lib/costing";
import { users } from "./lib/db/schema";

describe("integration self-test", () => {
  it("runs the full backend pipeline", async () => {
    // A user row is required for the proposal FK.
    const [u] = await db
      .insert(users)
      .values({ email: `selftest+${Date.now()}@convegenius.ai`, name: "Self Test" })
      .returning();

    // 1. Knowledge insert + retrieval (RAG)
    const kdoc = await addKnowledge({
      uploadedBy: u.id,
      kind: "winning_proposal",
      title: "Rajasthan NIPUN winning bid",
      state: "Rajasthan",
      tags: ["nipun"],
      text: "ConveGenius delivered NIPUN assessment and VSK dashboards across Rajasthan schools.",
      words: 11,
    });
    const ctx = await retrieveContext({ state: "Rajasthan", keywords: ["NIPUN", "VSK"] });
    expect(ctx.length).toBeGreaterThan(0);
    expect(ctx[0].title).toContain("Rajasthan");

    // 2. Prompt override round-trip
    await setOverride("product", "selftest-prod", "OVERRIDE SYSTEM PROMPT", u.id);
    expect(await getOverride("product", "selftest-prod")).toBe("OVERRIDE SYSTEM PROMPT");

    // 3. Costing
    const cm2 = computeCm2({ budgetCr: 100, viaPartner: true });
    expect(cm2.cm2Pct).toBeGreaterThan(0);

    // 4. Create proposal + REAL (tiny) Claude generation
    const p = await createProposal({
      userId: u.id,
      title: "Self-test proposal",
      productId: "vsk1",
      productName: "VSK 1.0",
      generatorId: "proposal",
      generatorLabel: "Generate proposal",
      proposalType: "vsk",
      state: "Rajasthan",
      org: "direct",
      inputs: { systemPrompt: "test" },
      output: "",
      model: "claude-opus-4-8",
      status: "draft",
    });

    let streamed = "";
    const full = await streamProposal({
      system: "Reply in one short sentence. Plain text only.",
      user: "Say: integration test ok.",
      onText: (d) => { streamed += d; },
    });
    expect(full.length).toBeGreaterThan(0);
    expect(streamed).toBe(full);
    await finalizeProposalOutput(p.id, full);

    const fetched = await getProposal(p.id);
    expect(fetched?.output).toBe(full);

    // 5. Versions: refine adds v2, restore works
    await addVersion(p.id, "## Revised\nNew content.", "Refine: test");
    const versions = await getVersions(p.id);
    expect(versions.length).toBeGreaterThanOrEqual(2);
    const v1 = await getVersion(p.id, 1);
    expect(v1?.content).toBe(full);

    // 6. Exports produce real files
    const docx = await markdownToDocxBuffer("# Title\n\n- bullet\n\n1. one\n\nPara **bold**.");
    expect(docx.length).toBeGreaterThan(500);
    const pdf = await markdownToPdfBuffer("# Title\n\nPara.", "Self-test");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");

    // 7. Analytics
    const a = await analytics();
    expect(a.totals.total).toBeGreaterThan(0);

    // Cleanup test rows.
    await db.delete(proposals).where(eq(proposals.id, p.id)); // cascades versions
    await archiveKnowledge(kdoc.id);
    await db.delete(users).where(eq(users.id, u.id));
  }, 60000);
});
