"use client";

import { useEffect, useState } from "react";
import ModelPicker from "./ModelPicker";
import AutoToggle from "./AutoToggle";
import KnowAboutMe from "./KnowAboutMe";

interface Thread { id: string; title: string; updatedAt: string }
interface Model { id: string; label: string; hint?: string; provider?: string }

// Document-type shortcuts → jump into the Generate form with that generator.
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DOC_TAGS: { label: string; generatorId: string }[] = [
  { label: "Proposal", generatorId: "proposal" },
  { label: "PAB note", generatorId: "pab_note" },
  { label: "RFP response", generatorId: "rfp_response" },
  { label: "Concept note", generatorId: "concept_note" },
  { label: "Executive summary", generatorId: "executive_summary" },
  { label: "CM2 analysis", generatorId: "cm2_analysis" },
];

export default function ResearchLanding({
  onResearch,
  onGenerate,
  onOpenChat,
}: {
  onResearch: (message: string, model: string) => void;
  onGenerate: () => void;
  onOpenChat: (id: string) => void;
}) {
  const [msg, setMsg] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState("claude-opus-4-8");
  const [auto, setAuto] = useState(false);
  const [autoConsent, setAutoConsent] = useState(false);
  const [askAuto, setAskAuto] = useState(false);
  const [modelTouched, setModelTouched] = useState(false); // picked a model / touched Auto?
  const [askFirstAuto, setAskFirstAuto] = useState(false); // "let AI decide?" on first send
  const [promptedOnce, setPromptedOnce] = useState(false); // asked once already (persisted)

  useEffect(() => {
    fetch("/api/chat").then((r) => r.json()).then((d) => {
      setModels(d.models || []);
      setModel(d.default || "claude-opus-4-8");
    }).catch(() => {});
    try {
      if (localStorage.getItem("cg-auto-consent") === "1") setAutoConsent(true);
      if (localStorage.getItem("cg-model-prompted") === "1") setPromptedOnce(true);
    } catch {}
  }, []);

  // Ask the "let AI decide?" prompt only once, ever — persisted (shared with chat).
  function markPrompted() {
    try { localStorage.setItem("cg-model-prompted", "1"); } catch {}
    setPromptedOnce(true);
  }

  // Auto toggle — one-time consent on first enable (shared flag with the chat);
  // picking a specific model turns Auto off.
  function toggleAuto() {
    setModelTouched(true); markPrompted();
    if (auto) { setAuto(false); return; }
    if (!autoConsent) { setAskAuto(true); return; }
    setAuto(true);
  }
  function acceptAuto() {
    try { localStorage.setItem("cg-auto-consent", "1"); } catch {}
    setAutoConsent(true); setAskAuto(false); setAuto(true); setModelTouched(true); markPrompted();
  }
  function pickModel(id: string) { setModel(id); setAuto(false); setModelTouched(true); markPrompted(); }

  // First-send prompt: user answered yes → hand off to the chat in Auto.
  function firstAutoYes() {
    try { localStorage.setItem("cg-auto-consent", "1"); } catch {}
    markPrompted(); setAskFirstAuto(false);
    const t = msg.trim();
    if (t) onResearch(t, "auto");
  }
  function firstAutoNo() {
    markPrompted(); setAskFirstAuto(false);
    const t = msg.trim();
    if (t) onResearch(t, model);
  }

  // Load threads on mount (for the "Previous chats" section) and refresh when the
  // history drawer opens.
  useEffect(() => {
    fetch("/api/chat/threads").then((r) => r.json()).then((d) => setThreads(d.threads || [])).catch(() => {});
  }, [historyOpen]);

  function submit() {
    const t = msg.trim();
    if (!t) return;
    // Ask once, ever — only if never prompted and no model preference set yet.
    if (!auto && !modelTouched && !promptedOnce) { setAskFirstAuto(true); return; }
    onResearch(t, auto ? "auto" : model);
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><div className="topbar-title">Proposal Engine</div></div>
        <div className="topbar-right">
          <KnowAboutMe
            icon="ti-search"
            sub="Live web + knowledge-base research for the education ecosystem."
            can={[
              "I answer questions about live tenders, state budgets, schemes and competitors — searching the web and your knowledge base, and citing every source.",
              "Ask me to draft a document mid-chat and I'll generate it, or use the shortcuts below to jump straight into the generator.",
            ]}
            how={[
              "Type a question and press <strong>Enter</strong>; switch models with the selector if you like.",
              "Keep the thread going for follow-ups, or attach a document with <strong>+</strong> to ground the answer in it.",
              "Open <strong>Chat history</strong> (top-right) to revisit past research — each chat is auto-titled.",
            ]}
          />
          <button className="btn btn-outline" onClick={() => setHistoryOpen(true)}><i className="ti ti-history" /> Chat history</button>
        </div>
      </div>

      <div className="research-land">
        <div className="research-inner">
          <div className="research-hero">
          <h1 className="research-title">Research</h1>
          <p className="research-sub">
            Ask about live tenders, budgets, schemes and competitors — grounded in the web and your knowledge base. Or generate a document below.
          </p>

          <div
            className="research-box glow-border"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
          >
            <textarea
              className="research-input"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Ask anything about the education ecosystem…"
              rows={2}
            />
            <div className="research-box-bar">
              <span className="research-hint"><i className="ti ti-world" /> Web-grounded · Enter to send</span>
              <div className="research-actions">
                <AutoToggle on={auto} onToggle={toggleAuto} />
                <ModelPicker models={models} value={model} onChange={pickModel} />
                <button className="research-send" disabled={!msg.trim()} onClick={submit} aria-label="Research">
                  <i className="ti ti-arrow-up" />
                </button>
              </div>
            </div>
          </div>
          </div>

          <button
            className="research-card glow-border"
            onClick={onGenerate}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
          >
            <div className="research-card-left">
              <div className="research-card-head">
                <span className="research-card-badge" aria-hidden="true"><i className="ti ti-sparkles" /></span>
                <div className="research-card-title">Generate Document</div>
              </div>
              <p className="research-card-desc">
                Turn a short brief into a complete, PAB-ready document — structured, costed and cited.
              </p>
              <span className="research-card-cta">Open the generator <i className="ti ti-arrow-right" /></span>
            </div>
            <div className="research-card-right">
              <div className="research-card-right-label">Documents you can generate</div>
              <div className="research-card-chips">
                {DOC_TAGS.map((t) => (
                  <span key={t.generatorId} className="research-card-chip">{t.label}</span>
                ))}
              </div>
            </div>
          </button>

          {threads.length > 0 && (
            <div className="research-recents">
              <div className="research-recents-head">
                <span className="research-recents-label"><i className="ti ti-message" /> Previous chats</span>
                {threads.length > 6 && (
                  <button className="research-recents-all" onClick={() => setHistoryOpen(true)}>View all</button>
                )}
              </div>
              <div className="research-recents-list">
                {threads.slice(0, 6).map((t) => (
                  <button key={t.id} className="research-recent-item" onClick={() => onOpenChat(t.id)} title={t.title}>
                    <i className="ti ti-message" />
                    <span className="research-recent-title">{t.title}</span>
                    <span className="research-recent-date">{fmtDate(t.updatedAt)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {historyOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setHistoryOpen(false)} />
          <aside className="drawer">
            <div className="drawer-head">
              <div className="drawer-title"><i className="ti ti-history" /> Chat history</div>
              <button className="btn btn-ghost" onClick={() => setHistoryOpen(false)} aria-label="Close"><i className="ti ti-x" /></button>
            </div>
            <div className="drawer-body">
              {threads.length === 0 ? (
                <div className="drawer-empty">No chats yet.</div>
              ) : (
                threads.map((t) => (
                  <button key={t.id} className="drawer-item" onClick={() => { setHistoryOpen(false); onOpenChat(t.id); }}>
                    <i className="ti ti-message" />
                    <span>{t.title}</span>
                  </button>
                ))
              )}
            </div>
          </aside>
        </>
      )}

      {askAuto && (
        <div className="modal-overlay" onMouseDown={() => setAskAuto(false)}>
          <div className="auto-consent" onMouseDown={(e) => e.stopPropagation()}>
            <div className="auto-consent-ico"><i className="ti ti-sparkles" /></div>
            <div className="auto-consent-title">Let the assistant pick the model?</div>
            <p className="auto-consent-body">
              In <strong>Auto</strong> mode, the engine chooses the best model for each message —
              a fast one for quick questions, the strongest for drafting full proposals. You can
              switch back to a specific model any time from the selector.
            </p>
            <div className="auto-consent-actions">
              <button className="btn btn-outline" onClick={() => setAskAuto(false)}>Not now</button>
              <button className="btn btn-primary" onClick={acceptAuto}><i className="ti ti-sparkles" /> Turn on Auto</button>
            </div>
          </div>
        </div>
      )}

      {askFirstAuto && (
        <div className="modal-overlay" onMouseDown={firstAutoNo}>
          <div className="auto-consent" onMouseDown={(e) => e.stopPropagation()}>
            <div className="auto-consent-ico"><i className="ti ti-sparkles" /></div>
            <div className="auto-consent-title">Let AI choose the model?</div>
            <p className="auto-consent-body">
              You haven&apos;t picked a model. For better efficiency, the assistant can choose the
              right one for each message — a fast model for quick questions, the strongest for
              drafting full documents. You can switch to a specific model any time.
            </p>
            <div className="auto-consent-actions">
              <button className="btn btn-outline" onClick={firstAutoNo}>Cancel</button>
              <button className="btn btn-primary" onClick={firstAutoYes}><i className="ti ti-sparkles" /> Yes, let AI decide</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
