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
}

// Streams the model response, invoking onText for each delta, and returns the
// full accumulated text. Streaming is required for long proposals to avoid
// request timeouts.
export async function streamProposal({ system, user, onText }: StreamArgs): Promise<string> {
  let full = "";
  const stream = anthropic.messages.stream({
    model: PROPOSAL_MODEL,
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
