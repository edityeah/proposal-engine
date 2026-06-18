// Live self-test for Phase 6 chat. Run:
//   set -a && . ./.env.local && set +a && npx vitest run src/chat.itest.ts --config vitest.selftest.config.ts
import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "./lib/db";
import { users } from "./lib/db/schema";
import { anthropic } from "./lib/anthropic";
import { chatSystemPrompt, GENERATE_DOC_TOOL, runGenerateDocument } from "./lib/chat";
import { createThread, addMessage, getMessages, listThreads, deleteThread } from "./lib/db/chat";

const WEB_SEARCH = { type: "web_search_20260209", name: "web_search", max_uses: 3, allowed_callers: ["direct"] };

describe("Phase 6 chat self-test", () => {
  it("the API accepts the chat tool schemas and streams text", async () => {
    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system: chatSystemPrompt(),
      tools: [WEB_SEARCH as never, GENERATE_DOC_TOOL as never],
      messages: [{ role: "user", content: "Reply with one short sentence. Do not use any tools." }],
    });
    const final = await stream.finalMessage();
    const text = final.content.find((c) => c.type === "text") as { text?: string } | undefined;
    expect(text?.text && text.text.length > 0).toBe(true);
  }, 60000);

  it("runGenerateDocument drafts and saves a proposal", async () => {
    const [u] = await db
      .insert(users)
      .values({ email: `chattest+${Date.now()}@convegenius.ai`, name: "Chat Test" })
      .returning();
    try {
      const res = await runGenerateDocument(
        { generatorId: "concept_note", productId: "vsk1", proposalType: "vsk", state: "Bihar", department: "Samagra Shiksha" },
        u.id,
      );
      expect("proposalId" in res).toBe(true);
      if ("proposalId" in res) {
        expect(res.proposalId).toBeTruthy();
        expect(res.words).toBeGreaterThan(100);
      }

      // chat persistence round-trip
      const thread = await createThread(u.id, "claude-opus-4-8", "test thread");
      await addMessage(thread.id, "user", "hello");
      await addMessage(thread.id, "assistant", "hi there", "proposalId" in res ? res.proposalId : null);
      const msgs = await getMessages(thread.id);
      expect(msgs.length).toBe(2);
      expect((await listThreads(u.id)).length).toBeGreaterThan(0);
      await deleteThread(thread.id, u.id);
      expect((await listThreads(u.id)).length).toBe(0);
    } finally {
      await db.delete(users).where(eq(users.id, u.id)); // cascades threads + proposals
    }
  }, 90000);
});
