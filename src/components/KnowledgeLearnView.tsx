"use client";

import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { STATES } from "@/config/orgs";

function renderMd(md: string): string {
  const raw = marked.parse(md || "", { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}

// "Upload & learn" is for proposals you authored that WON or LOST — the doctype
// here is the *recipe* the example teaches, NOT a knowledge-base "kind".
// (Received documents like RFPs / SOPs are reference material — they go through
// the plain Knowledge base upload, not this screen.)
const DOCTYPES = [
  { value: "pab-note", label: "PAB note" },
  { value: "rfp-response", label: "RFP response" },
  { value: "proposal", label: "Full proposal" },
  { value: "exec-summary", label: "Executive summary" },
  { value: "concept-note", label: "Concept note" },
];

export default function KnowledgeLearnView({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [doctype, setDoctype] = useState("pab-note");
  const [outcome, setOutcome] = useState<"won" | "lost">("won");
  const [title, setTitle] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [tags, setTags] = useState("");
  const [phase, setPhase] = useState<"pick" | "processing" | "done">("pick");
  const [md, setMd] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const doctypeLabel = DOCTYPES.find((d) => d.value === doctype)?.label || doctype;

  // Abort any in-flight distill if the screen closes mid-stream.
  useEffect(() => () => abortRef.current?.abort(), []);

  function choose(f: File | undefined) {
    if (!f) return;
    setFile(f);
    autofill(f); // AI reads the first pages → doc type, title, state, tags (you set Won/Lost)
  }

  // Cheap/fast metadata extraction from the first pages. Fills the form; user can edit.
  async function autofill(f: File) {
    setAutoFilling(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/knowledge/autofill", { method: "POST", body: fd });
      if (!res.ok) return;
      const d = await res.json();
      if (d.doctype) setDoctype(d.doctype);
      if (d.title) setTitle(d.title);
      if (d.state) setStateVal(d.state);
      if (Array.isArray(d.tags) && d.tags.length) setTags(d.tags.join(", "));
    } catch {
      // best-effort — leave fields for manual entry
    } finally {
      setAutoFilling(false);
    }
  }

  // POST the file to the distill endpoint and stream knowledge.md in as it arrives.
  async function process() {
    if (!file || phase === "processing") return;
    setPhase("processing");
    setMd("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("doctype", doctype);
    fd.append("outcome", outcome);
    fd.append("title", title || file.name);
    fd.append("state", stateVal);
    fd.append("tags", tags);
    try {
      const res = await fetch("/api/knowledge/distill", { method: "POST", body: fd, signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setMd("> ⚠ **Couldn't distill.** " + (err.error || `HTTP ${res.status}`));
        setPhase("done");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMd(acc);
      }
      setPhase("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setMd("> ⚠ **Error:** " + ((e as Error).message || "distill failed"));
      setPhase("done");
    }
  }

  // Persist the uploaded document to the knowledge base so it shows in the tab.
  // Won → winning_proposal, Lost → losing_proposal. Reuses /api/knowledge (server-side).
  async function save() {
    if (!file || saving) return;
    setSaving(true); setSaveErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", outcome === "won" ? "winning_proposal" : "losing_proposal");
      fd.append("title", title || file.name);
      fd.append("state", stateVal);
      fd.append("tags", tags);
      const res = await fetch("/api/knowledge", { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setSaveErr(e.error || `Save failed (HTTP ${res.status})`);
        return;
      }
      onClose(); // parent reloads the KB list
    } catch (e) {
      setSaveErr((e as Error).message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <button className="btn btn-ghost" onClick={onClose}><i className="ti ti-arrow-left" /></button>
          <div className="topbar-title">Upload &amp; learn</div>
          {file && <span className="tag"><i className="ti ti-file-text" /> {file.name}</span>}
        </div>
        {phase === "done" && (
          <div className="topbar-right">
            {saveErr && <span style={{ fontSize: 12.5, color: "var(--danger, #b0494a)", alignSelf: "center", marginRight: 4 }}>{saveErr}</span>}
            <button className="btn btn-outline" onClick={onClose} disabled={saving}>Discard</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !file}>
              {saving ? <><span className="spinner-ring" style={{ width: 14, height: 14 }} /> Saving…</> : <><i className="ti ti-check" /> Save to knowledge base</>}
            </button>
          </div>
        )}
      </div>

      <div className="page-content">
        {phase === "pick" ? (
          <div className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
            <div className="card-header"><div className="card-title"><i className="ti ti-cloud-upload" /> Learn from a won / lost proposal</div></div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={(e) => choose(e.target.files?.[0])} />
            <div
              className="upload-zone"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag"); }}
              onDragLeave={(e) => e.currentTarget.classList.remove("drag")}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("drag"); choose(e.dataTransfer.files?.[0]); }}
            >
              <i className="ti ti-cloud-upload" />
              <div className="upload-zone-title">{file ? file.name : "Click or drop a document"}</div>
              <div className="upload-zone-sub">PDF, Word (.docx), or text · the agent extracts what to learn</div>
            </div>

            {autoFilling && (
              <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--primary)", display: "flex", alignItems: "center", gap: 7 }}>
                <span className="spinner-ring" style={{ width: 13, height: 13 }} /> Reading the first pages to auto-fill type, title, state &amp; tags…
              </div>
            )}

            <div className="field" style={{ marginTop: 14 }}>
              <label>Title <span style={{ fontWeight: 400, color: "var(--text-hint)" }}>· auto-filled, editable</span></label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HP Vidya Utkarsh winning bid" />
            </div>

            <div className="grid-2" style={{ marginTop: 12 }}>
              <div className="field">
                <label>Document type <span style={{ fontWeight: 400, color: "var(--text-hint)" }}>(which recipe it teaches)</span></label>
                <select value={doctype} onChange={(e) => setDoctype(e.target.value)}>
                  {DOCTYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Outcome</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className={"btn " + (outcome === "won" ? "btn-primary" : "btn-outline")} style={{ flex: 1, justifyContent: "center" }} onClick={() => setOutcome("won")}><i className="ti ti-trophy" /> Won</button>
                  <button className={"btn " + (outcome === "lost" ? "btn-primary" : "btn-outline")} style={{ flex: 1, justifyContent: "center" }} onClick={() => setOutcome("lost")}><i className="ti ti-x" /> Lost</button>
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ marginTop: 12 }}>
              <div className="field">
                <label>State</label>
                <select value={stateVal} onChange={(e) => setStateVal(e.target.value)}>
                  <option value="">Select state</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Tags <span style={{ fontWeight: 400, color: "var(--text-hint)" }}>(comma-separated)</span></label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="NIPUN, VSK, Assessment" />
              </div>
            </div>

            <div className="banner info" style={{ marginTop: 14 }}>
              <i className="ti ti-bulb" />
              <div>{outcome === "won"
                ? `A won ${doctypeLabel} is added to the shelf and teaches the ${doctypeLabel} recipe what to DO.`
                : `A lost ${doctypeLabel} is learned from — it teaches the ${doctypeLabel} recipe what to AVOID — and is kept off the shelf.`}</div>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: "var(--text-hint)", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-info-circle" /> Received documents (RFPs, SOPs) are reference material — add those from the Knowledge base list, not here.
            </div>

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary" disabled={!file} onClick={process}><i className="ti ti-sparkles" /> Process with agent</button>
            </div>
          </div>
        ) : (
          <div className="split-2">
            {/* LEFT — the document + status */}
            <div className="card">
              <div className="card-header"><div className="card-title"><i className="ti ti-file-text" /> {file?.name || "Document"}</div></div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <span className="tag">{doctypeLabel}</span>
                <span className={"tag " + (outcome === "won" ? "tag-teal" : "")}>
                  <i className={"ti " + (outcome === "won" ? "ti-trophy" : "ti-x")} /> {outcome === "won" ? "Won" : "Lost"}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                {phase === "processing" ? (
                  <><span className="spinner-ring" style={{ width: 14, height: 14 }} /> Reading &amp; distilling…</>
                ) : (
                  <><i className="ti ti-circle-check" style={{ color: "var(--success-text)" }} /> Done — review the knowledge on the right, then save.</>
                )}
              </div>
            </div>

            {/* RIGHT — live knowledge.md */}
            <div className="card">
              <div className="card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="card-title"><i className="ti ti-markdown" /> knowledge.md</div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>what the bot learned</span>
              </div>
              <div className="markdown-body" style={{ fontSize: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: renderMd(md) }} />
              {phase === "processing" && <span className="kl-cursor" />}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
