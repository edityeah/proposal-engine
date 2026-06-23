import OpenAI from "openai";
import { GENERATE_DOC_TOOL, runGenerateDocument } from "@/lib/chat";

// Lazy so the build (no key present) doesn't construct it; runtime needs a key.
let _openai: OpenAI | null = null;
function openaiClient(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const MAX_TURNS = 6;

interface RunArgs {
  model: string;
  system: string;
  history: { role: "user" | "assistant"; content: string }[];
  userMessage: string;
  userId: string;
  onText: (delta: string) => void;
  onToolStatus: (name: "web_search" | "generate_document") => void;
  onDoc: (proposalId: string, title: string) => void;
}

// Agentic OpenAI chat via the Responses API: built-in web search + a
// generate_document function tool (same pipeline Claude uses). Returns the
// full visible assistant text.
export async function runOpenAIChat(a: RunArgs): Promise<string> {
  const tools = [
    { type: "web_search" as const },
    {
      type: "function" as const,
      name: GENERATE_DOC_TOOL.name,
      description: GENERATE_DOC_TOOL.description,
      parameters: GENERATE_DOC_TOOL.input_schema,
      strict: false,
    },
  ];

  let input: unknown[] = [
    ...a.history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: a.userMessage },
  ];
  let previousId: string | undefined;
  let visible = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = openaiClient().responses.stream({
      model: a.model,
      instructions: a.system,
      input: input as never,
      tools: tools as never,
      store: true,
      ...(previousId ? { previous_response_id: previousId } : {}),
    });

    let sawWebSearch = false;
    for await (const ev of stream as AsyncIterable<{ type?: string; delta?: string; item?: { type?: string } }>) {
      const t = ev.type || "";
      if (t === "response.output_text.delta" && ev.delta) {
        visible += ev.delta;
        a.onText(ev.delta);
      } else if (t.includes("web_search") && !sawWebSearch) {
        sawWebSearch = true;
        a.onToolStatus("web_search");
      } else if (t === "response.output_item.added" && ev.item?.type === "function_call") {
        a.onToolStatus("generate_document");
      }
    }

    const final = await stream.finalResponse();
    previousId = final.id;

    const calls = (final.output as { type: string; name?: string; call_id?: string; arguments?: string }[])
      .filter((o) => o.type === "function_call");
    if (!calls.length) break;

    input = [];
    for (const c of calls) {
      let out = "";
      if (c.name === "generate_document") {
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(c.arguments || "{}"); } catch {}
        const res = await runGenerateDocument(parsed, a.userId);
        if ("proposalId" in res) {
          a.onDoc(res.proposalId, res.title);
          out = `Document saved. proposalId=${res.proposalId}, title="${res.title}", ~${res.words} words. Tell the user it's ready to open in the editor.`;
        } else {
          out = "Error: " + res.error;
        }
      } else {
        out = "Unknown tool.";
      }
      (input as unknown[]).push({ type: "function_call_output", call_id: c.call_id, output: out });
    }
  }

  return visible;
}
