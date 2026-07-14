"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import ModelPicker from "./ModelPicker";
import type { CurrentProposal } from "@/lib/types";
import { htmlToMarkdown } from "@/lib/html-to-markdown";
import ProposalRoom from "./presence/ProposalRoom";
import TeamBar from "./presence/TeamBar";
import DocComments, { type PendingComment } from "./DocComments";
import DocOutline from "./DocOutline";

function renderMd(md: string): string {
  const raw = marked.parse(md || "", { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}

const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
  draft: { label: "Draft", cls: "status-draft", icon: "ti-pencil" },
  in_review: { label: "In review", cls: "status-in_review", icon: "ti-eye" },
  won: { label: "Won", cls: "status-won", icon: "ti-trophy" },
  lost: { label: "Lost", cls: "status-lost", icon: "ti-x" },
};

const ENHANCE_INSTRUCTION =
  "Enhance and polish the highlighted text: improve clarity, flow, tone and specificity, and fix any grammar — without changing its meaning or the facts.";

// Quick doc-level actions offered in the Copilot panel. Each is a whole-document
// refine instruction (no text selection). Instructions carry the anti-fabrication
// rule so the model placeholders missing figures instead of inventing them.
const COPILOT_CHIPS: { label: string; instruction: string }[] = [
  { label: "Tighten the writing", instruction: "Tighten the whole document: make it more concise and sharper without dropping any facts, figures, or required sections." },
  { label: "Add impact metrics", instruction: "Add concrete, measurable impact metrics / KPIs where they strengthen the case. Use only figures already present in the document; for any missing figure, insert a clearly-marked [INSERT: …] placeholder — never invent a number." },
  { label: "Draft a rollout budget", instruction: "Add a phased rollout budget: lay out the cost structure (component → unit → total) mapped to budget heads. Use [INSERT: …] placeholders for any unknown rate — never fabricate figures." },
];

export default function OutputView({
  proposal,
  refreshKey,
  hasInputs,
  onBack,
  onRefine,
  onSetStatus,
  onSaveEdit,
  onRestore,
}: {
  proposal: CurrentProposal;
  refreshKey: number;
  hasInputs?: boolean;
  onBack: () => void;
  onRefine: (instruction: string, selection: string, opts?: { model?: string; attachment?: { filename: string; text: string } }) => void;
  onSetStatus: (status: string, reason: string) => void;
  onSaveEdit: (content: string) => Promise<boolean>;
  onRestore: (content: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  // Floating top-right rail: which feature panel (if any) is open.
  const [railPanel, setRailPanel] = useState<null | "versions" | "rfp" | "copilot">(null);
  const [copilotAsk, setCopilotAsk] = useState("");
  const [cpModels, setCpModels] = useState<{ id: string; label: string }[]>([]);
  const [cpModel, setCpModel] = useState("claude-opus-4-8");
  const [cpAttach, setCpAttach] = useState<{ filename: string; text: string } | null>(null);
  const [cpUploading, setCpUploading] = useState(false);
  const [cpUploadErr, setCpUploadErr] = useState<string | null>(null);
  const cpFileRef = useRef<HTMLInputElement>(null);
  // Hovering AI corrector: text highlighted in the doc → a persistent popover
  // shown just below the cursor, whose actions refine the selection in the panel.
  const [selPop, setSelPop] = useState<{ text: string; x: number; y: number; range: Range } | null>(null);
  const [selAsk, setSelAsk] = useState("");
  const [pendingComment, setPendingComment] = useState<PendingComment | null>(null); // selection → comment composer
  const [outlineOpen, setOutlineOpen] = useState(false); // outline starts collapsed; user clicks to open
  const [starred, setStarred] = useState(!!proposal.starred); // same star as My Docs

  // Keep the star in sync when a different doc opens.
  useEffect(() => { setStarred(!!proposal.starred); }, [proposal.id, proposal.starred]);
  function toggleStar() {
    if (!proposal.id) return;
    const next = !starred;
    setStarred(next);
    fetch(`/api/proposals/${proposal.id}/star`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ starred: next }),
    }).catch(() => {});
  }

  // Open the comment composer for the current selection (Google-Docs style).
  function startComment() {
    if (!selPop) return;
    const rc = selPop.range.getBoundingClientRect();
    setPendingComment({ quote: selPop.text, rect: { left: rc.left, top: rc.top, bottom: rc.bottom, width: rc.width } });
    setSelPop(null);
  }
  // Co-Pilot panel conversation turn for a selection edit (request + reply + thinking).
  const [cpTurn, setCpTurn] = useState<{ you: string; ai: string; busy: boolean } | null>(null);
  const selPopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selPop) return;
    const onDown = (e: MouseEvent) => { if (!selPopRef.current?.contains(e.target as Node)) setSelPop(null); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [selPop]);
  // Refine runs on Anthropic, so offer only Claude models in the copilot picker.
  useEffect(() => {
    fetch("/api/chat").then((r) => r.json()).then((d) => {
      setCpModels(((d.models as { id: string; label: string }[]) || []).filter((m) => m.id.startsWith("claude")));
      if (typeof d.default === "string" && d.default.startsWith("claude")) setCpModel(d.default);
    }).catch(() => {});
  }, []);

  // ── Outcome change: mandatory reason captured via an overlay before saving ──
  const [outcomeDraft, setOutcomeDraft] = useState<string | null>(null); // target status
  const [outcomeReason, setOutcomeReason] = useState("");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false); // outcome picker in the header
  const [confirmBack, setConfirmBack] = useState(false); // "leave this doc?" guard

  // ── Always-on WYSIWYG editing — the document is editable by default; clicking
  // any text edits it inline, and every edit autosaves. No explicit edit mode. ──
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const lastSavedRef = useRef(proposal.output); // markdown
  const loadedRef = useRef<string | null>(null); // last output loaded into the editor
  const editorRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false); // guards against overlapping saves (prevents duplicate create)

  // Read the editor's current content as markdown (for save / exports).
  const currentMd = useCallback(
    () => (editorRef.current ? htmlToMarkdown(editorRef.current.innerHTML) : lastSavedRef.current),
    [],
  );

  const save = useCallback(async () => {
    const md = currentMd();
    // An unchanged, already-persisted doc needs no save. A doc with no id yet must
    // still be created even if its text is unchanged, so it lands in My docs.
    if (proposal.id && md === lastSavedRef.current) { setDirty(false); return true; }
    if (savingRef.current) return false; // a save is already in flight
    savingRef.current = true;
    setSaveState("saving");
    const ok = await onSaveEdit(md);
    savingRef.current = false;
    if (ok) { lastSavedRef.current = md; loadedRef.current = md; setSaveState("saved"); setDirty(false); return true; }
    setSaveState("error");
    return false;
  }, [currentMd, onSaveEdit, proposal.id]);

  // Load the document into the editable surface when a new doc loads or the output
  // changes externally (regenerate / refine) — never on the echo of our own save,
  // which would reset the cursor mid-edit.
  useEffect(() => {
    if (proposal.streaming || !editorRef.current) return;
    if (loadedRef.current === proposal.output) return;
    editorRef.current.innerHTML = renderMd(proposal.output);
    loadedRef.current = proposal.output;
    lastSavedRef.current = proposal.output;
    setSaveState("idle");
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal.output, proposal.id, proposal.streaming]);

  // Debounced autosave on each edit.
  function onEditorInput() {
    setDirty(true);
    setSaveState("idle");
    if (timerRef.current) clearTimeout(timerRef.current);
    // Autosave only once the doc exists (has an id); creating a brand-new doc is
    // reserved for an explicit "Save to My Docs" click.
    timerRef.current = setTimeout(() => { if (proposal.id) void save(); }, 1500);
  }

  // Rich-text command against the contentEditable surface.
  function exec(cmd: string, val?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    onEditorInput();
  }

  // Explicit "Save to My Docs" — flush any pending autosave and confirm.
  async function saveToMyDocs() {
    if (timerRef.current) clearTimeout(timerRef.current);
    const ok = await save();
    if (ok) { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2000); }
  }

  // Copilot panel action: run a whole-document refine. The panel stays OPEN — it
  // must persist across refines and only close when the user clicks ✕.
  function runCopilot(instruction: string) {
    if (proposal.streaming) return; // ignore while a refine is already streaming
    setCopilotAsk("");
    const att = cpAttach;
    setCpAttach(null);
    setCpUploadErr(null);
    onRefine(instruction, "", { model: cpModel, attachment: att || undefined });
  }
  async function cpPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCpUploadErr(null);
    setCpUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/rfp/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setCpUploadErr(d.error || "Upload failed."); return; }
      setCpAttach({ filename: d.filename, text: d.text });
    } catch {
      setCpUploadErr("Upload failed. Try a text-based PDF, .docx, or .txt.");
    } finally {
      setCpUploading(false);
    }
  }
  // Text highlighted → drop the corrector directly below the selected line (never
  // over it), flipping above only when there's no room below. Positioned from the
  // selection rect + layout viewport so the 90% zoom can't misplace it.
  function onDocMouseUp() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    if (sel.isCollapsed || !editorRef.current.contains(range.commonAncestorContainer)) { setSelPop(null); return; }
    const text = sel.toString().trim();
    if (!text) { setSelPop(null); return; }
    const rect = range.getBoundingClientRect();
    const root = document.documentElement;
    const POPW = 520, POPH = 46;
    let x = Math.min(rect.left, root.clientWidth - POPW - 8);
    if (x < 8) x = 8;
    // slim bar sits just ABOVE the selection (over already-read text); drop below only if no room
    let y = rect.top - POPH - 8;
    if (y < 8) y = rect.bottom + 8;
    setSelAsk("");
    // Clone the range now — we replace exactly this span in the DOM after the edit.
    setSelPop({ text, x, y, range: range.cloneRange() });
  }
  // The chosen action/instruction → open the Co-Pilot panel and rewrite JUST the
  // highlighted span. We replace the exact DOM range (not a markdown string-match,
  // which never matched rendered/formatted selections) so the change shows in the doc.
  async function askSelection(instruction: string) {
    const pop = selPop;
    if (!pop || !instruction.trim() || !editorRef.current) return;
    const range = pop.range;
    setSelPop(null);
    setSelAsk("");
    setRailPanel("copilot");
    setCpTurn({ you: instruction, ai: "", busy: true });
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, selection: pop.text }),
      });
      const d = await res.json().catch(() => ({}));
      const enhanced = (res.ok ? (d.text as string) : "") || "";
      const editor = editorRef.current;
      if (enhanced && editor && editor.contains(range.commonAncestorContainer)) {
        // Swap the highlighted range for the rendered enhanced snippet, then persist.
        range.deleteContents();
        const tmp = document.createElement("div");
        tmp.innerHTML = renderMd(enhanced);
        const frag = document.createDocumentFragment();
        while (tmp.firstChild) frag.appendChild(tmp.firstChild);
        range.insertNode(frag);
        onEditorInput();
        setCpTurn({ you: instruction, ai: "Done — updated the highlighted text in the document.", busy: false });
      } else {
        setCpTurn({ you: instruction, ai: "⚠️ " + (d.error || "Couldn't apply the edit — try re-selecting the text."), busy: false });
      }
    } catch (e) {
      setCpTurn({ you: instruction, ai: "⚠️ " + (e instanceof Error ? e.message : "Enhance failed."), busy: false });
    }
  }
  function copy() {
    navigator.clipboard.writeText(currentMd()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareCopyLink() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  function openOutcome(status: string) {
    setOutcomeDraft(status);
    // Pre-fill with the existing reason only when re-confirming the same outcome.
    setOutcomeReason(proposal.status === status ? (proposal.outcomeReason ?? "") : "");
  }
  function closeOutcome() {
    setOutcomeDraft(null);
    setOutcomeReason("");
  }
  function confirmOutcome() {
    const reason = outcomeReason.trim();
    if (!outcomeDraft || !reason) return; // reason is mandatory
    onSetStatus(outcomeDraft, reason);
    closeOutcome();
  }

  const meta = STATUS_META[proposal.status] || STATUS_META.draft;
  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed — retry"
    : dirty ? "Unsaved changes" : saveState === "saved" ? "All changes saved" : "";

  const body = (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="btn btn-ghost"
            title="Back"
            onClick={() => {
              // Guard against losing an in-progress generation or unsaved work.
              if (proposal.streaming || dirty || !proposal.id) setConfirmBack(true);
              else onBack();
            }}
          >
            <i className="ti ti-arrow-left" />
          </button>
          <div className="topbar-title">{proposal.title || "Document"}</div>
          {proposal.id && !proposal.streaming && (
            <button
              className={"doc-star" + (starred ? " on" : "")}
              onClick={toggleStar}
              aria-pressed={starred}
              title={starred ? "Starred — click to unstar" : "Star this document"}
            >
              <i className={"ti " + (starred ? "ti-star-filled" : "ti-star")} />
            </button>
          )}
        </div>
        <div className="topbar-right">
          {proposal.id && <TeamBar />}
          {saveLabel && (
            <span style={{ fontSize: 12, color: saveState === "error" ? "var(--danger-text)" : "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              {saveState === "saving" && <span className="spinner-ring" style={{ width: 12, height: 12 }} />}
              {saveState === "saved" && !dirty && <i className="ti ti-check" />}
              {saveLabel}
            </span>
          )}
          {/* Outcome control — mark the doc In review / Won / Lost; feeds History + analytics.
              Only for a saved doc (needs an id to persist). Opens the mandatory-reason overlay. */}
          <div className="export-wrap">
            <button
              className={"btn btn-outline status-trigger " + meta.cls}
              onClick={() => setStatusMenuOpen((o) => !o)}
              disabled={!proposal.id}
              title="Set outcome"
            >
              <i className={"ti " + meta.icon} /> {meta.label}
              <i className="ti ti-chevron-down" style={{ fontSize: 14, marginLeft: 2 }} />
            </button>
            {statusMenuOpen && (
              <>
                <div className="export-backdrop" onClick={() => setStatusMenuOpen(false)} />
                <div className="export-menu">
                  {["in_review", "won", "lost"].map((s) => (
                    <button
                      key={s}
                      className="export-item"
                      onClick={() => { openOutcome(s); setStatusMenuOpen(false); }}
                    >
                      <i className={"ti " + STATUS_META[s].icon} /> Mark as {STATUS_META[s].label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button className="btn btn-outline" onClick={() => setShareOpen(true)} disabled={!proposal.id}>
            <i className="ti ti-share-2" /> Share
          </button>
          <div className="export-wrap">
            <button className="btn btn-outline" onClick={() => setExportOpen((o) => !o)} disabled={proposal.streaming}>
              <i className="ti ti-download" /> Export
              <i className="ti ti-chevron-down" style={{ fontSize: 14, marginLeft: 2 }} />
            </button>
            {exportOpen && (
              <>
                <div className="export-backdrop" onClick={() => setExportOpen(false)} />
                <div className="export-menu">
                  <button className="export-item" onClick={() => { copy(); setExportOpen(false); }}>
                    <i className={"ti " + (copied ? "ti-check" : "ti-copy")} /> {copied ? "Copied!" : "Copy text"}
                  </button>
                  <a
                    className="export-item"
                    href={proposal.id ? `/api/proposals/${proposal.id}/export` : "#"}
                    aria-disabled={!proposal.id}
                    onClick={() => setExportOpen(false)}
                  >
                    <i className="ti ti-file-type-docx" /> Download .docx
                  </a>
                  <a
                    className="export-item"
                    href={proposal.id ? `/api/proposals/${proposal.id}/export?format=pdf` : "#"}
                    aria-disabled={!proposal.id}
                    onClick={() => setExportOpen(false)}
                  >
                    <i className="ti ti-file-type-pdf" /> Download PDF
                  </a>
                </div>
              </>
            )}
          </div>
          {/* Rightmost primary action — Save to My Docs. Only shown for a not-yet-saved
              doc (the generate flow); once it has an id (saved, or opened from My Docs)
              the button is gone and edits autosave silently. */}
          {!proposal.id && (
            <button className="btn btn-primary" onClick={saveToMyDocs} disabled={proposal.streaming || !proposal.output}>
              <i className={"ti " + (savedFlash ? "ti-check" : "ti-folder-plus")} /> {savedFlash ? "Saved" : "Save to My Docs"}
            </button>
          )}
        </div>
      </div>

      <div className={"page-content" + (hasInputs ? " has-inputs" : "")}>
        <div className={"output-layout" + (railPanel === "copilot" ? " copilot-open" : "")}>
          {proposal.id && (
            <DocOutline editorRef={editorRef} contentKey={proposal.output} open={outlineOpen} onOpenChange={setOutlineOpen} hidden={proposal.streaming} />
          )}
          <div className="doc-col">
            {!proposal.streaming && (
              <div className="doc-hint">
                <i className="ti ti-cursor-text" /> This document is editable — click anywhere to change the text; edits save automatically. Use <strong>Ask Co-Pilot AI</strong> on the right for AI help.
              </div>
            )}
            {proposal.streaming ? (
              proposal.output ? (
                <div className="output-doc streaming">
                  {proposal.output}
                  <span className="dw-caret" />
                </div>
              ) : (
                <div className="output-doc doc-writing">
                  <div className="doc-writing-head">
                    <span className="dw-spark"><i className="ti ti-sparkles" /></span>
                    <span>Drafting your document…</span>
                  </div>
                  <div className="dw-lines">
                    {[95, 82, 88, 64, 90, 76, 96, 70, 84, 58].map((w, i) => (
                      <div key={i} className="dw-line" style={{ width: w + "%", animationDelay: (i * 0.13).toFixed(2) + "s" }} />
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div>
                {/* Formatting toolbar — always available; edits the formatted document directly. */}
                <div style={{ position: "sticky", top: 60, zIndex: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, padding: 6, marginBottom: 10, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                  {([
                    { cmd: "formatBlock", val: "H1", icon: "ti-h-1", title: "Heading 1" },
                    { cmd: "formatBlock", val: "H2", icon: "ti-h-2", title: "Heading 2" },
                    { cmd: "formatBlock", val: "H3", icon: "ti-h-3", title: "Heading 3" },
                    { cmd: "formatBlock", val: "P", icon: "ti-pilcrow", title: "Paragraph" },
                    { sep: true },
                    { cmd: "bold", icon: "ti-bold", title: "Bold" },
                    { cmd: "italic", icon: "ti-italic", title: "Italic" },
                    { sep: true },
                    { cmd: "insertUnorderedList", icon: "ti-list", title: "Bullet list" },
                    { cmd: "insertOrderedList", icon: "ti-list-numbers", title: "Numbered list" },
                    { sep: true },
                    { cmd: "createLink", icon: "ti-link", title: "Add link", link: true },
                    { cmd: "removeFormat", icon: "ti-clear-formatting", title: "Clear formatting" },
                  ] as Array<{ cmd?: string; val?: string; icon?: string; title?: string; sep?: boolean; link?: boolean }>).map((b, i) =>
                    b.sep ? (
                      <span key={i} style={{ width: 1, height: 20, background: "var(--border)", margin: "0 3px" }} />
                    ) : (
                      <button
                        key={i}
                        className="btn btn-ghost"
                        title={b.title}
                        style={{ padding: "6px 8px" }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (b.link) { const url = window.prompt("Link URL:"); if (url) exec("createLink", url); }
                          else exec(b.cmd!, b.val);
                        }}
                      >
                        <i className={"ti " + b.icon} />
                      </button>
                    ),
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", paddingRight: 6 }}>
                    <i className="ti ti-writing" /> Editable — no markup
                  </span>
                </div>
                <div
                  ref={editorRef}
                  className="output-doc markdown-body"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck
                  onInput={onEditorInput}
                  onMouseUp={onDocMouseUp}
                  style={{ minHeight: "58vh", outline: "none", cursor: "text" }}
                />
              </div>
            )}
          </div>

          {/* Right side — a floating Ask Co-Pilot AI button that opens a 70/30 split-screen chat.
              Suppressed when the left inputs panel is present: that panel hosts the Co-Pilot instead. */}
          {proposal.id && !proposal.streaming && railPanel !== "copilot" && !hasInputs && (
            <button className="ask-copilot-btn" title="Ask Co-Pilot AI" onClick={() => setRailPanel("copilot")}>
              <i className="ti ti-sparkles" /> Ask Co-Pilot AI
            </button>
          )}

          {/* Panel is persistent: it renders even while a refine streams, and only
              closes when the user clicks ✕ — clicking a chip must never dismiss it. */}
          {proposal.id && railPanel === "copilot" && !hasInputs && (
                  <div className="copilot-panel">
                    <div className="copilot-panel-head">
                      <span className="cp-title"><i className="ti ti-sparkles" /> Ask Co-Pilot AI</span>
                      <span className="cp-grounded">grounded in this doc</span>
                      <button className="cp-close" title="Close" onClick={() => setRailPanel(null)}><i className="ti ti-x" /></button>
                    </div>
                    <div className="copilot-panel-body">
                      {cpTurn ? (
                        <div className="cp-demo-turns">
                          <div className="cp-turn user"><div className="cp-user">{cpTurn.you}</div></div>
                          <div className="cp-turn assistant">
                            {cpTurn.busy
                              ? <div className="cp-thinking"><span className="cp-thinking-label">Enhancing selection</span><span className="cp-dot" /><span className="cp-dot" /><span className="cp-dot" /></div>
                              : <div className="markdown-body">{cpTurn.ai}</div>}
                          </div>
                        </div>
                      ) : (
                        <div className="cp-msg">
                          {proposal.streaming ? (
                            <div className="cp-thinking"><span className="cp-thinking-label">Working on {proposal.title || "this document"}</span><span className="cp-dot" /><span className="cp-dot" /><span className="cp-dot" /></div>
                          ) : (
                            <>I&apos;ve loaded <strong>{proposal.title || "this document"}</strong>. Want me to tighten the writing, add impact metrics, or draft a rollout budget?</>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="copilot-panel-foot">
                      <div className="cp-chips">
                        {COPILOT_CHIPS.map((c) => (
                          <button key={c.label} className="cp-chip" disabled={proposal.streaming} onClick={() => runCopilot(c.instruction)}>{c.label}</button>
                        ))}
                      </div>
                      {cpAttach && (
                        <div className="cp-attach-chip">
                          <i className="ti ti-file-text" />
                          <span className="fn">{cpAttach.filename}</span>
                          <button onClick={() => setCpAttach(null)} aria-label="Remove"><i className="ti ti-x" /></button>
                        </div>
                      )}
                      {cpUploadErr && <div className="cp-upload-err">{cpUploadErr}</div>}
                      <div className="cp-input-wrap">
                        <button className="cp-attach" title="Attach a reference document" disabled={cpUploading} onClick={() => cpFileRef.current?.click()}>
                          <i className={"ti " + (cpUploading ? "ti-loader" : "ti-plus")} />
                        </button>
                        <input
                          className="cp-input"
                          value={copilotAsk}
                          onChange={(e) => setCopilotAsk(e.target.value)}
                          placeholder="Ask the copilot to edit…"
                          onKeyDown={(e) => { if (e.key === "Enter" && copilotAsk.trim()) runCopilot(copilotAsk.trim()); }}
                        />
                        <button className="cp-send" title="Send" disabled={!copilotAsk.trim() || proposal.streaming} onClick={() => { if (copilotAsk.trim()) runCopilot(copilotAsk.trim()); }}>
                          <i className="ti ti-arrow-up" />
                        </button>
                      </div>
                      {cpModels.length > 0 && (
                        <div className="cp-model">
                          <ModelPicker models={cpModels} value={cpModel} onChange={setCpModel} up />
                        </div>
                      )}
                      <input ref={cpFileRef} type="file" accept=".pdf,.docx,.doc,.txt" hidden onChange={cpPickFile} />
                    </div>
                  </div>
          )}
        </div>
      </div>

      {shareOpen && (
        <div className="modal-overlay" onMouseDown={() => setShareOpen(false)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-title"><i className="ti ti-share-2" /> Share this proposal</div>
            <div className="modal-sub">Anyone with access to this workspace can open the document from the link below.</div>
            <div className="share-row">
              <input className="share-link" readOnly value={typeof window !== "undefined" ? window.location.href : ""} onFocus={(e) => e.currentTarget.select()} />
              <button className="btn btn-primary" onClick={shareCopyLink}>
                <i className={"ti " + (linkCopied ? "ti-check" : "ti-copy")} /> {linkCopied ? "Copied" : "Copy link"}
              </button>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShareOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {outcomeDraft && (
        <div className="modal-overlay" onMouseDown={closeOutcome}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <i className={"ti " + STATUS_META[outcomeDraft].icon} /> Mark as {STATUS_META[outcomeDraft].label}
            </div>
            <div className="modal-sub">Add a reason for this outcome — it's required and saved with the document.</div>
            <textarea
              className="modal-textarea"
              autoFocus
              value={outcomeReason}
              onChange={(e) => setOutcomeReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeOutcome();
                else if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && outcomeReason.trim()) confirmOutcome();
              }}
              placeholder={
                outcomeDraft === "won" ? "e.g. Strong price and proven FLN outcomes; the incumbent underbid."
                : outcomeDraft === "lost" ? "e.g. Lost on commercials; competitor bundled hardware."
                : "e.g. Submitted to the department; awaiting the April PAB review."
              }
            />
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={closeOutcome}>Cancel</button>
              <button className="btn btn-primary" disabled={!outcomeReason.trim()} onClick={confirmOutcome}>
                <i className="ti ti-check" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmBack && (
        <div className="modal-overlay" onMouseDown={() => setConfirmBack(false)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <i className="ti ti-arrow-left" /> Leave this document?
            </div>
            <div className="modal-sub">
              {proposal.streaming
                ? "The document is still being generated. If you leave now, generation stops and you may lose the draft."
                : "You have unsaved changes on this document. If you leave now, they may be lost."}
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConfirmBack(false)}>No, stay</button>
              <button className="btn btn-primary" onClick={() => { setConfirmBack(false); onBack(); }}>
                <i className="ti ti-arrow-left" /> Yes, leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hovering AI corrector — a slim one-row bar just above the selection */}
      {selPop && (
        <div
          ref={selPopRef}
          className="sel-bar"
          style={{ position: "fixed", left: selPop.x, top: selPop.y, zIndex: 95 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button className="sel-bar-btn" title="Enhance & polish" onMouseDown={(e) => e.preventDefault()} onClick={() => askSelection(ENHANCE_INSTRUCTION)}><i className="ti ti-wand" /> Enhance</button>
          <button className="sel-bar-btn" title="Make it concise" onMouseDown={(e) => e.preventDefault()} onClick={() => askSelection("Make this selection more concise and sharper — without dropping any facts, figures, or meaning.")}><i className="ti ti-arrows-minimize" /> Concise</button>
          <button className="sel-bar-btn" title="More formal tone" onMouseDown={(e) => e.preventDefault()} onClick={() => askSelection("Rewrite this selection in a more formal, institutional government-note register.")}><i className="ti ti-writing" /> Formal</button>
          <span className="sel-bar-div" />
          <button className="sel-bar-btn sel-bar-comment" title="Comment on this selection" onMouseDown={(e) => e.preventDefault()} onClick={startComment}><i className="ti ti-message-plus" /> Comment</button>
          <span className="sel-bar-div" />
          <input
            className="sel-bar-input"
            value={selAsk}
            placeholder="Ask Co-Pilot to edit…"
            onChange={(e) => setSelAsk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && selAsk.trim()) askSelection(selAsk.trim());
              else if (e.key === "Escape") setSelPop(null);
            }}
          />
        </div>
      )}

      {proposal.id && (
        <DocComments
          proposalId={proposal.id}
          editorRef={editorRef}
          pending={pendingComment}
          onClose={() => setPendingComment(null)}
        />
      )}
    </>
  );

  // Presence is scoped per-proposal: wrap the whole view in one room so both the
  // top-bar avatars and the sidebar collaborators list share a single connection.
  return proposal.id ? (
    <ProposalRoom proposalId={proposal.id}>{body}</ProposalRoom>
  ) : body;
}
