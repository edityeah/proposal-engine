import { auth } from "@/lib/auth";
import { anthropic } from "@/lib/anthropic";
import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL,
  isValidChatModel,
  chatSystemPrompt,
  GENERATE_DOC_TOOL,
  runGenerateDocument,
} from "@/lib/chat";
import { createThread, getThread, getMessages, addMessage, renameThread } from "@/lib/db/chat";

export const runtime = "nodejs";
export const maxDuration = 120;

// allowed_callers:["direct"] keeps web search usable on every model in the
// picker (Haiku doesn't support the programmatic-tool-calling path the tool
// otherwise defaults to).
const WEB_SEARCH_TOOL = { type: "web_search_20260209", name: "web_search", max_uses: 6, allowed_callers: ["direct"] };
const MAX_TURNS = 6;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const userId = session.user.id;

  const body = (await req.json().catch(() => ({}))) as {
    threadId?: string;
    message?: string;
    model?: string;
  };
  const message = (body.message || "").trim();
  if (!message) return Response.json({ error: "Empty message" }, { status: 400 });
  const model = isValidChatModel(body.model || "") ? (body.model as string) : DEFAULT_CHAT_MODEL;

  // Resolve or create the thread.
  let thread = body.threadId ? await getThread(body.threadId, userId) : null;
  let isNew = false;
  if (!thread) {
    thread = await createThread(userId, model, message.slice(0, 60));
    isNew = true;
  }
  const threadId = thread.id;

  // Build message history from stored turns + the new user message.
  const prior = await getMessages(threadId);
  type Msg = { role: "user" | "assistant"; content: unknown };
  const messages: Msg[] = prior.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  messages.push({ role: "user", content: message });
  await addMessage(threadId, "user", message);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      send({ t: "meta", threadId, title: thread!.title, isNew });

      let visibleText = "";
      let generatedProposalId: string | null = null;

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const mstream = anthropic.messages.stream({
            model,
            max_tokens: 8000,
            thinking: { type: "adaptive" } as never,
            system: chatSystemPrompt(),
            tools: [WEB_SEARCH_TOOL as never, GENERATE_DOC_TOOL as never],
            messages: messages as never,
          });

          for await (const ev of mstream) {
            if (ev.type === "content_block_start") {
              const b = ev.content_block as { type?: string; name?: string };
              if (b.type === "server_tool_use" || b.name === "web_search") send({ t: "tool", name: "web_search", status: "running" });
              if (b.type === "tool_use" && b.name === "generate_document") send({ t: "tool", name: "generate_document", status: "running" });
            } else if (ev.type === "content_block_delta") {
              const d = ev.delta as { type?: string; text?: string };
              if (d.type === "text_delta" && d.text) { visibleText += d.text; send({ t: "text", d: d.text }); }
            }
          }

          const final = await mstream.finalMessage();
          messages.push({ role: "assistant", content: final.content });

          if (final.stop_reason === "pause_turn") continue; // server tool paused; resume

          if (final.stop_reason === "tool_use") {
            const toolUses = final.content.filter(
              (c): c is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
                (c as { type?: string }).type === "tool_use",
            );
            const results: unknown[] = [];
            for (const tu of toolUses) {
              if (tu.name === "generate_document") {
                const res = await runGenerateDocument(tu.input, userId);
                if ("error" in res) {
                  results.push({ type: "tool_result", tool_use_id: tu.id, content: "Error: " + res.error, is_error: true });
                } else {
                  generatedProposalId = res.proposalId;
                  send({ t: "doc", proposalId: res.proposalId, title: res.title });
                  results.push({ type: "tool_result", tool_use_id: tu.id, content: `Document saved. proposalId=${res.proposalId}, title="${res.title}", ~${res.words} words. Tell the user it's ready to open in the editor.` });
                }
              }
            }
            if (results.length) { messages.push({ role: "user", content: results }); continue; }
          }
          break; // end_turn or nothing more to do
        }

        await addMessage(threadId, "assistant", visibleText || "(no text response)", generatedProposalId);
        if (isNew) await renameThread(threadId, userId, message.slice(0, 60));
        send({ t: "done", threadId });
      } catch (e) {
        send({ t: "error", message: e instanceof Error ? e.message : "Chat failed" });
        if (visibleText) await addMessage(threadId, "assistant", visibleText, generatedProposalId).catch(() => {});
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}

export async function GET() {
  return Response.json({ models: CHAT_MODELS, default: DEFAULT_CHAT_MODEL });
}
