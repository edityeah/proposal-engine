"use client";

import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import ModelPicker from "./ModelPicker";

interface Msg { role: "user" | "assistant"; content: string }
interface Model { id: string; label: string }

function md(s: string): string {
  return DOMPurify.sanitize(marked.parse(s || "", { async: false }) as string, { USE_PROFILES: { html: true } });
}

const CHIPS = [
  "Which states have open FLN tenders?",
  "Summarise NIPUN Bharat priorities",
  "How should I frame a VSK proposal?",
];

// Floating "Ask AI Copilot" for the Generate screen. Splits the screen (form
// reflows) rather than overlaying. Answers stream from /api/chat with a
// switchable model and an optional attached document, one thread for follow-ups.
export default function GenerateCopilot({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState("claude-opus-4-8");
  const [attachment, setAttachment] = useState<{ filename: string; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/chat").then((r) => r.json()).then((d) => { setModels(d.models || []); setModel(d.default || "claude-opus-4-8"); }).catch(() => {});
  }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages, open]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/rfp/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setUploadErr(d.error || "Upload failed."); return; }
      setAttachment({ filename: d.filename, text: d.text });
    } catch {
      setUploadErr("Upload failed. Try a text-based PDF, .docx, or .txt.");
    } finally {
      setUploading(false);
    }
  }

  async function send(text?: string) {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    setInput("");
    const att = attachment;
    setAttachment(null);
    setUploadErr(null);
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: t }, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, message: t, model, attachment: att || undefined }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const dec = new TextDecoder();
      let buf = "";
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
          if (ev.t === "meta") setThreadId(ev.threadId as string);
          else if (ev.t === "text") setMessages((m) => bump(m, (a) => ({ ...a, content: a.content + (ev.d as string) })));
          else if (ev.t === "error") setMessages((m) => bump(m, (a) => ({ ...a, content: a.content + "\n\n⚠️ " + (ev.message as string) })));
        }
      }
    } catch (e) {
      setMessages((m) => bump(m, (a) => ({ ...a, content: a.content + "\n\n⚠️ " + (e instanceof Error ? e.message : "failed") })));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <div className="doc-rail">
          <button className="doc-rail-fab" title="Ask AI Copilot" onClick={() => onOpenChange(true)}>
            <i className="ti ti-sparkles" />
          </button>
        </div>
      )}

      {open && (
        <div className="gen-copilot-panel">
          <div className="copilot-panel-head">
            <span className="cp-title"><i className="ti ti-sparkles" /> Copilot</span>
            <span className="cp-grounded">web + knowledge base</span>
            <button className="cp-close" title="Close" onClick={() => onOpenChange(false)}><i className="ti ti-x" /></button>
          </div>
          <div className="copilot-panel-body" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="cp-msg">
                Hi! I can research the education ecosystem — tenders, budgets, schemes and competitors — and help you frame a document before you generate. Ask me anything, or attach a document for context.
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={"cp-turn " + m.role}>
                  {m.role === "assistant"
                    ? <div className="markdown-body" dangerouslySetInnerHTML={{ __html: md(m.content || (busy ? "…" : "")) }} />
                    : <div className="cp-user">{m.content}</div>}
                </div>
              ))
            )}
          </div>
          <div className="copilot-panel-foot">
            {messages.length === 0 && (
              <div className="cp-chips">
                {CHIPS.map((c) => <button key={c} className="cp-chip" onClick={() => send(c)}>{c}</button>)}
              </div>
            )}
            {attachment && (
              <div className="cp-attach-chip">
                <i className="ti ti-file-text" />
                <span className="fn">{attachment.filename}</span>
                <button onClick={() => setAttachment(null)} aria-label="Remove"><i className="ti ti-x" /></button>
              </div>
            )}
            {uploadErr && <div className="cp-upload-err">{uploadErr}</div>}
            <div className="cp-input-wrap">
              <button className="cp-attach" title="Attach a document" disabled={uploading || busy} onClick={() => fileRef.current?.click()}>
                <i className={"ti " + (uploading ? "ti-loader" : "ti-plus")} />
              </button>
              <input
                className="cp-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the copilot…"
                onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) send(); }}
              />
              <button className="cp-send" title="Send" disabled={busy || !input.trim()} onClick={() => send()}>
                <i className={"ti " + (busy ? "ti-loader" : "ti-arrow-up")} />
              </button>
            </div>
            <div className="cp-model">
              <ModelPicker models={models} value={model} onChange={setModel} up />
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" hidden onChange={onPickFile} />
          </div>
        </div>
      )}
    </>
  );
}

function bump(m: Msg[], fn: (a: Msg) => Msg): Msg[] {
  if (!m.length) return m;
  const c = m.slice();
  c[c.length - 1] = fn(c[c.length - 1]);
  return c;
}
