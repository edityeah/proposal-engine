"use client";

import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

interface Thread { id: string; title: string; model: string; updatedAt: string }
interface Doc { proposalId: string; title: string }
interface Msg { role: "user" | "assistant"; content: string; docs?: Doc[] }
interface Model { id: string; label: string }

function md(s: string) {
  return DOMPurify.sanitize(marked.parse(s || "", { async: false }) as string, { USE_PROFILES: { html: true } });
}

export default function ChatView({ onOpenProposal }: { onOpenProposal: (id: string) => void }) {
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState("claude-opus-4-8");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tool, setTool] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function refreshThreads() {
    fetch("/api/chat/threads").then((r) => r.json()).then((d) => setThreads(d.threads || []));
  }
  useEffect(() => {
    fetch("/api/chat").then((r) => r.json()).then((d) => { setModels(d.models || []); setModel(d.default || "claude-opus-4-8"); });
    refreshThreads();
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages, tool]);

  function newChat() { setThreadId(null); setMessages([]); setTool(null); }

  async function loadThread(id: string) {
    setTool(null);
    const r = await fetch(`/api/chat/threads/${id}`);
    if (!r.ok) return;
    const d = await r.json();
    setThreadId(id);
    setModel(d.thread.model);
    setMessages(
      (d.messages as { role: "user" | "assistant"; content: string; proposalId: string | null }[]).map((m) => ({
        role: m.role,
        content: m.content,
        docs: m.proposalId ? [{ proposalId: m.proposalId, title: "Generated document" }] : undefined,
      })),
    );
  }

  async function del(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/chat/threads/${id}`, { method: "DELETE" });
    if (threadId === id) newChat();
    setThreads((t) => t.filter((x) => x.id !== id));
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setTool(null);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, message: text, model }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const dec = new TextDecoder();
      let buf = "";
      let curThread = threadId;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: Record<string, unknown>;
          try { ev = JSON.parse(line); } catch { continue; }
          if (ev.t === "meta") { curThread = ev.threadId as string; setThreadId(curThread); }
          else if (ev.t === "text") { setMessages((m) => bumpLast(m, (a) => ({ ...a, content: a.content + (ev.d as string) }))); }
          else if (ev.t === "tool") { setTool(ev.name === "web_search" ? "Searching the web…" : "Drafting the document…"); }
          else if (ev.t === "doc") { setMessages((m) => bumpLast(m, (a) => ({ ...a, docs: [...(a.docs || []), { proposalId: ev.proposalId as string, title: ev.title as string }] }))); setTool(null); }
          else if (ev.t === "error") { setMessages((m) => bumpLast(m, (a) => ({ ...a, content: a.content + "\n\n⚠️ " + (ev.message as string) }))); }
          else if (ev.t === "done") { setTool(null); refreshThreads(); }
        }
      }
    } catch (e) {
      setMessages((m) => bumpLast(m, (a) => ({ ...a, content: a.content + "\n\n⚠️ " + (e instanceof Error ? e.message : "failed") })));
    } finally {
      setBusy(false);
      setTool(null);
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><div className="topbar-title">Research chat</div></div>
        <div className="topbar-right">
          <select value={model} onChange={(e) => setModel(e.target.value)} disabled={busy}
            style={{ fontSize: 12, padding: "7px 10px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg-page)" }}>
            {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <button className="btn btn-outline" onClick={newChat}><i className="ti ti-plus" /> New chat</button>
        </div>
      </div>

      <div className="chat-layout">
        <div className="chat-threads">
          <div className="section-label" style={{ padding: "0 4px 6px" }}>Recent chats</div>
          {threads.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 4 }}>No chats yet.</div>}
          {threads.map((t) => (
            <div key={t.id} className={"chat-thread-item" + (t.id === threadId ? " active" : "")} onClick={() => loadThread(t.id)}>
              <i className="ti ti-message" />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
              <button className="btn btn-ghost" style={{ padding: 3 }} onClick={(e) => del(t.id, e)}><i className="ti ti-trash" /></button>
            </div>
          ))}
        </div>

        <div className="chat-main">
          <div className="chat-scroll" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="chat-empty">
                <i className="ti ti-search" style={{ fontSize: 30, color: "var(--navy-500)" }} />
                <div style={{ fontWeight: 600, marginTop: 10 }}>Research the education ecosystem</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, maxWidth: 460 }}>
                  Ask about live tenders, state budgets, schemes, or competitors — answers cite live web sources.
                  Or ask me to draft a proposal and I&apos;ll generate it for you.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 16 }}>
                  {["Which states have open FLN/NIPUN tenders right now?", "Summarise Rajasthan's 2025 Samagra Shiksha priorities", "Draft a concept note for VSK 2.0 in Bihar"].map((q) => (
                    <button key={q} className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => setInput(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={"chat-msg " + m.role}>
                <div className="chat-avatar">{m.role === "user" ? <i className="ti ti-user" /> : <i className="ti ti-sparkles" />}</div>
                <div className="chat-bubble">
                  {m.role === "assistant"
                    ? <div className="markdown-body" dangerouslySetInnerHTML={{ __html: md(m.content || (busy ? "…" : "")) }} />
                    : <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>}
                  {m.docs?.map((d) => (
                    <div key={d.proposalId} className="chat-doc-card">
                      <i className="ti ti-file-text" style={{ fontSize: 20, color: "var(--navy-700)" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Generated draft saved to History</div>
                      </div>
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => onOpenProposal(d.proposalId)}>Open in editor</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {tool && <div className="chat-tool-status"><span className="spinner-ring" /> {tool}</div>}
          </div>

          <div className="chat-composer">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about tenders, schemes, budgets… or ask me to draft a document. (Enter to send, Shift+Enter for newline)"
              rows={2}
            />
            <button className="btn btn-primary" disabled={busy || !input.trim()} onClick={send}>
              <i className={"ti " + (busy ? "ti-loader" : "ti-send")} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function bumpLast(m: Msg[], fn: (a: Msg) => Msg): Msg[] {
  if (!m.length) return m;
  const copy = m.slice();
  copy[copy.length - 1] = fn(copy[copy.length - 1]);
  return copy;
}
