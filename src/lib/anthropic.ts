import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  // Don't throw at import time in dev; the route surfaces a clean error instead.
  console.warn("ANTHROPIC_API_KEY is not set — generation will fail until it is.");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Default model for proposal drafting. Opus 4.8 for the highest-quality drafts;
// route cheaper doc types to claude-sonnet-4-6 later if cost becomes a concern.
export const PROPOSAL_MODEL = "claude-opus-4-8";
export const MAX_TOKENS = 16000;

interface StreamArgs {
  system: string;
  user: string;
  onText: (delta: string) => void;
  model?: string;
}

// Streams the model response, invoking onText for each delta, and returns the
// full accumulated text. Streaming is required for long proposals to avoid
// request timeouts. `model` defaults to PROPOSAL_MODEL (Anthropic only).
export async function streamProposal({ system, user, onText, model }: StreamArgs): Promise<string> {
  let full = "";
  const stream = anthropic.messages.stream({
    model: model || PROPOSAL_MODEL,
    max_tokens: MAX_TOKENS,
    // Adaptive thinking is the recommended mode for Opus 4.8. The installed SDK
    // type defs predate it, so cast past the stale union; the API accepts it.
    thinking: { type: "adaptive" } as unknown as Anthropic.ThinkingConfigParam,
    system,
    messages: [{ role: "user", content: user }],
  });

  stream.on("text", (delta) => {
    full += delta;
    onText(delta);
  });

  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    throw new Error(
      "The model declined this request. Adjust the inputs and try again.",
    );
  }
  return full;
}

// Rewrites a highlighted snippet per an instruction (Enhance / Concise / Formal
// or a free-text ask) and returns ONLY the revised snippet, so the caller can
// swap it in place. Uses a small/fast model — this is a short edit, not a draft.
export async function enhanceSelection(instruction: string, selection: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1500,
    system:
      "You revise a snippet of document text. Apply the user's instruction and return ONLY the revised snippet — " +
      "no preamble, no explanation, no surrounding quotes or code fences. Preserve the original meaning and every " +
      "fact/number; never invent figures.",
    messages: [{ role: "user", content: `Instruction: ${instruction}\n\nSnippet:\n${selection}` }],
  });
  return res.content
    .map((c) => ((c as { type?: string; text?: string }).type === "text" ? (c as { text?: string }).text || "" : ""))
    .join("")
    .trim();
}
