"use client";

import { useEffect, useRef, useState } from "react";

export interface RfpDoc {
  id: string;
  title: string;
  filename: string | null;
  blobUrl: string | null;
  state: string | null;
  words: number;
  text?: string;
}

type Turn = { role: "user" | "assistant"; content: string };

// Appends `fn(content)` to the last assistant turn.
function bumpLast(turns: Turn[], fn: (c: string) => string): Turn[] {
  const copy = turns.slice();
  for (let i = copy.length - 1; i >= 0; i--) {
    if (copy[i].role === "assistant") {
      copy[i] = { ...copy[i], content: fn(copy[i].content) };
      break;
    }
  }
  return copy;
}

const CHIPS = ["Summarise this RFP", "Key requirements", "Eligibility & deadlines", "Evaluation criteria"];

// Viewer for an RFP document — fills the main content area (the left nav stays
// visible). Opening "Ask Co-Pilot AI" splits the screen: document on the left, a
// Co-Pilot chat (grounded in this RFP) docked on the right.
export default function RfpViewer({ doc, onClose }: { doc: RfpDoc; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Hovering AI corrector: highlight text in the RFP → a persistent popover below
  // the cursor whose actions ask the grounded chat about that excerpt.
  const [selPop, setSelPop] = useState<{ text: string; x: number; y: number } | null>(null);
  const [selAsk, setSelAsk] = useState("");
  const selPopRef = useRef<HTMLDivElement>(null);
  const selDocRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selPop) return;
    const onDown = (e: MouseEvent) => { if (!selPopRef.current?.contains(e.target as Node)) setSelPop(null); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [selPop]);

  async function send(qRaw: string) {
    const q = qRaw.trim();
    if (!q || busy) return;
    setAsk("");
    setTurns((t) => [...t, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          attachment: doc.text ? { filename: doc.filename || doc.title, text: doc.text } : undefined,
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response");
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
          if (ev.t === "text") setTurns((t) => bumpLast(t, (c) => c + (ev.d as string)));
          else if (ev.t === "error") setTurns((t) => bumpLast(t, (c) => c + "\n\n⚠️ " + (ev.message as string)));
        }
        bodyRef.current?.scrollTo({ top: 1e9 });
      }
    } catch (e) {
      setTurns((t) => bumpLast(t, (c) => c + "\n\n⚠️ " + (e instanceof Error ? e.message : "failed")));
    } finally {
      setBusy(false);
    }
  }

  // Text selected → drop the corrector directly below the selected line (never over
  // it), flipping above only when there's no room below.
  function onDocMouseUp() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !selDocRef.current) return;
    const range = sel.getRangeAt(0);
    if (sel.isCollapsed || !selDocRef.current.contains(range.commonAncestorContainer)) { setSelPop(null); return; }
    const text = sel.toString().trim();
    if (!text) { setSelPop(null); return; }
    const rect = range.getBoundingClientRect();
    const root = document.documentElement;
    const POPW = 520, POPH = 46;
    let x = Math.min(rect.left, root.clientWidth - POPW - 8);
    if (x < 8) x = 8;
    // slim bar sits just ABOVE the selection; drop below only if no room
    let y = rect.top - POPH - 8;
    if (y < 8) y = rect.bottom + 8;
    setSelAsk("");
    setSelPop({ text, x, y });
  }
  // The chosen action/question → open the chat + ask it about the excerpt.
  function askSelection(instruction: string) {
    const text = selPop?.text;
    if (!text || !instruction.trim()) return;
    setSelPop(null);
    setSelAsk("");
    setOpen(true);
    void send(`About this excerpt: "${text}"\n\n${instruction}`);
  }

  const meta = [doc.state, doc.words ? doc.words.toLocaleString("en-IN") + " words" : null].filter(Boolean).join("  ·  ");

  return (
    <div className="rfpv-overlay">
      <div className="topbar">
        <div className="topbar-left" style={{ minWidth: 0 }}>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Back"><i className="ti ti-arrow-left" /></button>
          <div className="topbar-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
        </div>
        <div className="topbar-right">
          {doc.blobUrl && (
            <a className="btn btn-outline" href={doc.blobUrl} target="_blank" rel="noreferrer"><i className="ti ti-download" /> Original</a>
          )}
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
        </div>
      </div>

      <div className={"rfpv-main" + (open ? " split" : "")}>
        <div className="rfpv-body" ref={selDocRef} onMouseUp={onDocMouseUp}>
          <div className="rfpv-doc">
            {meta && <div className="rfpv-meta"><i className="ti ti-file-search" /> {meta}</div>}
            <pre className="rfpv-text">{doc.text?.trim() || "No extracted text is stored for this document — open the original with the Download button above."}</pre>
          </div>
        </div>

        {open && (
          <aside className="rfpv-copilot">
            <div className="copilot-panel-head">
              <span className="cp-title"><i className="ti ti-sparkles" /> Ask Co-Pilot AI</span>
              <span className="cp-grounded">grounded in this RFP</span>
              <button className="cp-close" title="Close" onClick={() => setOpen(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="copilot-panel-body" ref={bodyRef}>
              {turns.length === 0 ? (
                <div className="cp-msg">
                  Ask me anything about <strong>{doc.title}</strong> — the key requirements, eligibility, deadlines, or how to respond.
                </div>
              ) : (
                turns.map((m, i) => (
                  <div key={i} className={"cp-turn " + m.role}>
                    {m.role === "user" ? <div className="cp-user">{m.content}</div> : <div className="markdown-body rfpv-answer">{m.content || "…"}</div>}
                  </div>
                ))
              )}
            </div>
            <div className="copilot-panel-foot">
              <div className="cp-chips">
                {CHIPS.map((c) => (
                  <button key={c} className="cp-chip" disabled={busy} onClick={() => send(c)}>{c}</button>
                ))}
              </div>
              <div className="cp-input-wrap">
                <input
                  className="cp-input"
                  value={ask}
                  onChange={(e) => setAsk(e.target.value)}
                  placeholder="Ask about this RFP…"
                  onKeyDown={(e) => { if (e.key === "Enter" && ask.trim()) send(ask); }}
                />
                <button className="cp-send" title="Send" disabled={!ask.trim() || busy} onClick={() => send(ask)}>
                  <i className="ti ti-arrow-up" />
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {!open && (
        <button className="ask-copilot-btn" title="Ask Co-Pilot AI" onClick={() => setOpen(true)}>
          <i className="ti ti-sparkles" /> Ask Co-Pilot AI
        </button>
      )}

      {/* Hovering AI corrector — a slim one-row bar just above the selection */}
      {selPop && (
        <div
          ref={selPopRef}
          className="sel-bar"
          style={{ position: "fixed", left: selPop.x, top: selPop.y, zIndex: 95 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button className="sel-bar-btn" title="Explain this" onMouseDown={(e) => e.preventDefault()} onClick={() => askSelection("Explain this excerpt in plain language.")}><i className="ti ti-help-circle" /> Explain</button>
          <button className="sel-bar-btn" title="Summarise" onMouseDown={(e) => e.preventDefault()} onClick={() => askSelection("Summarise the key points of this excerpt.")}><i className="ti ti-list" /> Summarise</button>
          <button className="sel-bar-btn" title="What does it require?" onMouseDown={(e) => e.preventDefault()} onClick={() => askSelection("What does this require us to do or provide? List the obligations.")}><i className="ti ti-checklist" /> Requires?</button>
          <span className="sel-bar-div" />
          <input
            className="sel-bar-input"
            value={selAsk}
            placeholder="Ask about the selection…"
            onChange={(e) => setSelAsk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && selAsk.trim()) askSelection(selAsk.trim());
              else if (e.key === "Escape") setSelPop(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
