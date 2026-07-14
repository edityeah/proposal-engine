"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import GenerateForm, { type GenFormSnapshot } from "./GenerateForm";
import OiResizeHandle from "./OiResizeHandle";
import ModelPicker from "./ModelPicker";
import type { CurrentProposal, ProposalInputs } from "@/lib/types";

// Whole-document refine shortcuts offered in the embedded Co-Pilot. Each carries
// the anti-fabrication rule so the model placeholders missing figures.
const COPILOT_CHIPS: { label: string; instruction: string }[] = [
  { label: "Tighten the writing", instruction: "Tighten the whole document: make it more concise and sharper without dropping any facts, figures, or required sections." },
  { label: "Add impact metrics", instruction: "Add concrete, measurable impact metrics / KPIs where they strengthen the case. Use only figures already present in the document; for any missing figure, insert a clearly-marked [INSERT: …] placeholder — never invent a number." },
  { label: "Draft a rollout budget", instruction: "Add a phased rollout budget: lay out the cost structure (component → unit → total) mapped to budget heads. Use [INSERT: …] placeholders for any unknown rate — never fabricate figures." },
];

// Read-only summary of the inputs behind the current draft, as labelled boxes.
function buildBoxes(i: ProposalInputs): { label: string; value: string }[] {
  const modules = i.selectedModuleNames?.length
    ? `${i.selectedModuleNames.length} selected`
    : i.singleModuleName || "";
  const orgLabel = i.org === "direct" ? "CG direct" : i.org === "psu" ? "Other PSU" : i.org;
  return [
    { label: "Document type", value: i.generatorLabel },
    { label: "Product", value: i.productName },
    { label: "Modules", value: modules },
    { label: "Organisation", value: orgLabel },
    { label: "State", value: i.state },
    { label: "Submission", value: i.submissionType },
    { label: "Duration", value: i.duration },
    { label: "Partner", value: i.implementingPartner || "None / direct" },
  ].filter((b) => b.value && b.value.trim());
}

// The left panel of the output view: a read-only snapshot of the generation inputs
// (pencil → edit all fields in an overlay) above an always-on Ask Co-Pilot chat.
export default function OiPanel({
  snapshot,
  inputs,
  proposal,
  busy,
  onGenerate,
  onRefine,
}: {
  snapshot: GenFormSnapshot;
  inputs: ProposalInputs | null;
  proposal: CurrentProposal;
  busy: boolean;
  onGenerate: (inputs: ProposalInputs, snapshot: GenFormSnapshot) => void;
  onRefine: (instruction: string, selection: string, opts?: { model?: string; attachment?: { filename: string; text: string } }) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [ask, setAsk] = useState("");
  const [models, setModels] = useState<{ id: string; label: string }[]>([]);
  const [model, setModel] = useState("claude-opus-4-8");
  const [attach, setAttach] = useState<{ filename: string; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Refine runs on Anthropic, so offer only Claude models in the picker.
  useEffect(() => {
    fetch("/api/chat").then((r) => r.json()).then((d) => {
      setModels(((d.models as { id: string; label: string }[]) || []).filter((m) => m.id.startsWith("claude")));
      if (typeof d.default === "string" && d.default.startsWith("claude")) setModel(d.default);
    }).catch(() => {});
  }, []);

  const boxes = inputs ? buildBoxes(inputs) : [];

  function run(instruction: string) {
    if (!instruction.trim() || busy) return;
    setAsk("");
    const att = attach;
    setAttach(null);
    setUploadErr(null);
    onRefine(instruction, "", { model, attachment: att || undefined });
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
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
      setAttach({ filename: d.filename, text: d.text });
    } catch {
      setUploadErr("Upload failed. Try a text-based PDF, .docx, or .txt.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="oi-scroll">
        {/* Snapshot of the inputs behind this draft — pencil opens the full editor overlay */}
        {boxes.length > 0 && (
          <div className="oi-snap">
            <div className="oi-snap-head">
              <div>
                <div className="oi-snap-title"><i className="ti ti-list-details" /> Generation input that you gave</div>
                <div className="oi-snap-sub">A snapshot of the inputs behind this draft.</div>
              </div>
              <button className="oi-edit-btn" title="Edit inputs" aria-label="Edit inputs" onClick={() => setEditOpen(true)}>
                <i className="ti ti-pencil" />
              </button>
            </div>
            <div className="oi-snap-grid">
              {boxes.map((b) => (
                <div key={b.label} className="oi-snap-box" title={`${b.label}: ${b.value}`}>
                  <div className="oi-snap-label">{b.label}</div>
                  <div className="oi-snap-val">{b.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ask Co-Pilot — always active */}
        <div className="oi-cp">
          <div className="oi-cp-title"><i className="ti ti-sparkles" /> Ask Co-Pilot</div>
          <div className="oi-cp-sub">Chat to refine the draft on the right.</div>
          {(
            <div className="oi-cp-greeting">
              {busy ? (
                <><i className="ti ti-loader" /> Working on <strong>{proposal.title || "this document"}</strong> — the edit is streaming into the document on the right.</>
              ) : (
                <>Hi! I&apos;m your Co-Pilot. Ask me to refine this draft — tighten the summary, adjust the commercials, add a section, or strengthen the compliance matrix.</>
              )}
            </div>
          )}
          <div className="cp-chips" style={{ marginTop: 12 }}>
            {COPILOT_CHIPS.map((c) => (
              <button key={c.label} className="cp-chip" disabled={busy} onClick={() => run(c.instruction)}>{c.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* pinned Co-Pilot input — the same input box as the doc-page Co-Pilot */}
      <div className="oi-cp-foot">
        {attach && (
          <div className="cp-attach-chip">
            <i className="ti ti-file-text" />
            <span className="fn">{attach.filename}</span>
            <button onClick={() => setAttach(null)} aria-label="Remove"><i className="ti ti-x" /></button>
          </div>
        )}
        {uploadErr && <div className="cp-upload-err">{uploadErr}</div>}
        <div className="cp-input-wrap">
          <button className="cp-attach" title="Attach a reference document" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <i className={"ti " + (uploading ? "ti-loader" : "ti-plus")} />
          </button>
          <input
            className="cp-input"
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            placeholder="Ask the copilot to edit…"
            onKeyDown={(e) => { if (e.key === "Enter" && ask.trim()) run(ask.trim()); }}
          />
          <button className="cp-send" title="Send" disabled={!ask.trim() || busy} onClick={() => { if (ask.trim()) run(ask.trim()); }}>
            <i className="ti ti-arrow-up" />
          </button>
        </div>
        {models.length > 0 && (
          <div className="cp-model"><ModelPicker models={models} value={model} onChange={setModel} up /></div>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" hidden onChange={pickFile} />
      </div>

      <OiResizeHandle />

      {/* Edit-inputs overlay — portaled to <body> so it escapes the panel's fixed
          stacking context and covers the sidebar + top bar */}
      {editOpen && createPortal(
        <div className="oi-edit-overlay" onMouseDown={() => setEditOpen(false)}>
          <div className="oi-edit-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="oi-edit-head">
              <div className="oi-edit-title"><i className="ti ti-adjustments-horizontal" /> Edit generation inputs</div>
              <button className="oi-edit-close" title="Close" onClick={() => setEditOpen(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="oi-edit-body">
              <GenerateForm
                mode="panel"
                defaults={snapshot}
                busy={busy}
                onGenerate={(inp, snap) => { setEditOpen(false); onGenerate(inp, snap); }}
              />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
