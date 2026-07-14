import { auth } from "@/lib/auth";
import { anthropic } from "@/lib/anthropic";
import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL,
  isValidChatModel,
  providerFor,
  pickAutoModel,
  chatModelLabel,
  chatSystemPrompt,
  GENERATE_DOC_TOOL,
  runGenerateDocument,
} from "@/lib/chat";
import { runOpenAIChat, titleFromOpenAI } from "@/lib/openai-chat";
import { streamGeminiMessages, geminiConfigured } from "@/lib/gemini";
import { createThread, getThread, getMessages, addMessage, renameThread } from "@/lib/db/chat";

export const runtime = "nodejs";
export const maxDuration = 300;

// allowed_callers:["direct"] keeps web search usable on every model in the
// picker (Haiku doesn't support the programmatic-tool-calling path the tool
// otherwise defaults to).
const WEB_SEARCH_TOOL = { type: "web_search_20260209", name: "web_search", max_uses: 6, allowed_callers: ["direct"] };
const MAX_TURNS = 6;

// A title is "generic" (worth (re)naming later) when it's empty, a greeting, or a
// bare acknowledgement — i.e. it doesn't describe the conversation's topic.
function isGenericTitle(t: string | null | undefined): boolean {
  const s = (t || "").trim().toLowerCase().replace(/[.!?…]+$/, "");
  if (!s || s.length <= 3) return true;
  return /^(hi+|hey+|hello+|hola|yo|sup|ok|okay|okk|thanks?|thank you|test+|new chat|reply with exactly[:,].*)$/.test(s);
}

// Generate a short, specific title from the conversation so far (not just the first
// message) so trivial openers like "hi" don't become the title. Uses Gemini when the
// chat model is Gemini; OpenAI when it's an OpenAI model; else a cheap Haiku call.
async function generateTitle(transcript: string, model: string): Promise<string | null> {
  const system = "You write very short, specific titles for chat conversations: 3–6 words, Title Case, no quotes, no trailing punctuation. Base the title on the SUBSTANTIVE topic of the conversation; ignore greetings and pleasantries.";
  const prompt = `Write a title for this conversation:\n\n${transcript.slice(0, 1500)}`;
  const tidy = (s: string) => s.replace(/^["'#\s]+/, "").replace(/["'\s]+$/, "").split("\n")[0].slice(0, 60).trim() || null;
  try {
    const provider = providerFor(model);
    if (provider === "gemini" && geminiConfigured()) {
      let out = "";
      await streamGeminiMessages([{ role: "system", content: system }, { role: "user", content: prompt }], (d) => { out += d; }, model);
      return tidy(out);
    }
    if (provider === "openai") {
      // Chat runs on OpenAI → title on OpenAI too, so it isn't just the first message.
      return tidy(await titleFromOpenAI(system, prompt));
    }
    const r = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 24,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const text = r.content
      .map((c) => ((c as { type?: string; text?: string }).type === "text" ? (c as { text?: string }).text || "" : ""))
      .join("");
    return tidy(text);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const userId = session.user.id;

  const body = (await req.json().catch(() => ({}))) as {
    threadId?: string;
    message?: string;
    model?: string;
    attachment?: { filename?: string; text?: string };
  };
  const message = (body.message || "").trim();
  if (!message) return Response.json({ error: "Empty message" }, { status: 400 });

  // Optional uploaded document — injected into THIS turn's model context only
  // (not stored or shown as the user message), so the model can answer against it.
  const attText = typeof body.attachment?.text === "string" ? body.attachment.text.slice(0, 100_000) : "";
  const modelMessage = attText
    ? `The user attached a document${body.attachment?.filename ? ` titled "${body.attachment.filename}"` : ""}. Treat its contents as the primary source for this turn.\n\n<attached_document>\n${attText}\n</attached_document>\n\nUser's message: ${message}`
    : message;
  // Auto mode: the engine picks the model per turn (within the Anthropic family).
  // The thread stores "auto" so returning to it keeps Auto selected; `model` is the
  // concrete model used for THIS turn, announced to the client via a {t:"model"} event.
  const isAuto = (body.model || "") === "auto";
  const autoPick = isAuto ? pickAutoModel(message, !!attText) : null;
  const model = isAuto
    ? (autoPick as { model: string }).model
    : (isValidChatModel(body.model || "") ? (body.model as string) : DEFAULT_CHAT_MODEL);
  const threadModel = isAuto ? "auto" : model;

  // Resolve or create the thread.
  let thread = body.threadId ? await getThread(body.threadId, userId) : null;
  let isNew = false;
  if (!thread) {
    // Always start neutral; a real title is generated below once there's substance.
    thread = await createThread(userId, threadModel, "New chat");
    isNew = true;
  }
  const threadId = thread.id;

  // Build message history from stored turns + the new user message.
  const prior = await getMessages(threadId);
  type Msg = { role: "user" | "assistant"; content: unknown };
  const messages: Msg[] = prior.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  messages.push({ role: "user", content: modelMessage });
  await addMessage(threadId, "user", message);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      send({ t: "meta", threadId, title: thread!.title, isNew });
      // Tell the client which model Auto picked for this turn (for the "Auto →
      // Claude Sonnet 4.6" pill). No-op when the user chose a model explicitly.
      if (isAuto) send({ t: "model", id: model, label: chatModelLabel(model), tier: autoPick!.tier });

      let visibleText = "";
      let generatedProposalId: string | null = null;
      // Web-search sources this turn — persisted as a hidden marker on the saved
      // message so the "Sources" chip can be rebuilt when the chat is reopened.
      const sources: { url: string; title: string }[] = [];
      const pushSource = (url: string, title: string) => {
        if (url && !sources.some((s) => s.url === url)) sources.push({ url, title: title || url });
      };
      const sourcesMarker = () =>
        sources.length
          ? "\n\n[[sources: " +
            sources
              .map((s) => `${s.url}|${(s.title || "").replace(/[|\]]/g, " ").replace(/;;/g, ",").trim()}`)
              .join(" ;; ") +
            "]]"
          : "";

      try {
        if (providerFor(model) === "openai") {
          await runOpenAIChat({
            model,
            system: chatSystemPrompt(),
            history: prior.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            userMessage: modelMessage,
            userId,
            onText: (d) => { visibleText += d; send({ t: "text", d }); },
            onToolStatus: (name) => send({ t: "tool", name, status: "running" }),
            onDoc: (pid, title) => { generatedProposalId = pid; send({ t: "doc", proposalId: pid, title }); },
            onSource: (url, title) => { send({ t: "source", url, title }); pushSource(url, title); },
          });
        } else if (providerFor(model) === "gemini") {
          // Gemini via the OpenAI-compatible API. Text-only for now — no web_search /
          // generate_document tool wiring (Gemini's compat layer lacks the Responses API).
          if (!geminiConfigured()) throw new Error("Gemini isn't configured — add GEMINI_API_KEY to .env.local and restart the dev server.");
          const history = prior.map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content) }));
          await streamGeminiMessages(
            [
              { role: "system", content: chatSystemPrompt() },
              ...history,
              { role: "user", content: modelMessage },
            ],
            (d) => { visibleText += d; send({ t: "text", d }); },
            model,
          );
        } else {
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

          // Surface web-search sources (from web_search_tool_result blocks).
          for (const block of final.content as { type?: string; content?: { type?: string; url?: string; title?: string }[] }[]) {
            if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
              for (const r of block.content) {
                if (r.type === "web_search_result" && r.url) { send({ t: "source", url: r.url, title: r.title || r.url }); pushSource(r.url, r.title || r.url); }
              }
            }
          }

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
        }

        await addMessage(threadId, "assistant", (visibleText || "(no text response)") + sourcesMarker(), generatedProposalId);
        // Name the chat only once a substantive user message exists (skip bare "hi"),
        // and only while it's still unnamed — using the whole exchange, not just the opener.
        const userSaidSomething = [...prior.filter((m) => m.role === "user").map((m) => String(m.content)), message]
          .some((u) => !isGenericTitle(u) && u.trim().length > 8);
        if (isGenericTitle(thread!.title) && userSaidSomething && prior.length <= 8) {
          const transcript = [...prior, { role: "user", content: message }, { role: "assistant", content: visibleText }]
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${String(m.content).slice(0, 400)}`)
            .join("\n");
          const title = await generateTitle(transcript, model);
          if (title && !isGenericTitle(title)) { await renameThread(threadId, userId, title); send({ t: "title", title }); }
        }
        send({ t: "done", threadId });
      } catch (e) {
        send({ t: "error", message: e instanceof Error ? e.message : "Chat failed" });
        if (visibleText) await addMessage(threadId, "assistant", visibleText + sourcesMarker(), generatedProposalId).catch(() => {});
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
