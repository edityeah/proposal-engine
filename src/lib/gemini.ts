import OpenAI from "openai";

// Gemini via Google's OpenAI-COMPATIBLE endpoint — lets us reuse the `openai`
// SDK (already a dependency) with a Gemini key. Model is env-overridable so you
// can point it at whatever your key can access.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  }
  return _client;
}

export type GeminiMsg = { role: "system" | "user" | "assistant"; content: string };

// Streams a Gemini chat completion; invokes onText per delta and returns the
// full accumulated text.
export async function streamGeminiMessages(
  messages: GeminiMsg[],
  onText: (delta: string) => void,
  model: string = GEMINI_MODEL,
): Promise<string> {
  let full = "";
  const stream = await client().chat.completions.create({
    model,
    stream: true,
    messages: messages as never,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content || "";
    if (delta) { full += delta; onText(delta); }
  }
  return full;
}
