"use client";

import { useMemo, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import type { CurrentProposal } from "@/lib/types";
import VersionHistory from "./VersionHistory";

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

export default function OutputView({
  proposal,
  refreshKey,
  onBack,
  onRefine,
  onSetStatus,
  onRestore,
}: {
  proposal: CurrentProposal;
  refreshKey: number;
  onBack: () => void;
  onRefine: (instruction: string, selection: string) => void;
  onSetStatus: (status: string) => void;
  onRestore: (content: string) => void;
}) {
  const [refinePrompt, setRefinePrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [compare, setCompare] = useState<{ content: string; label: string } | null>(null);

  const html = useMemo(() => {
    if (proposal.streaming) return "";
    return renderMd(proposal.output);
  }, [proposal.output, proposal.streaming]);
  const compareHtml = useMemo(() => (compare ? renderMd(compare.content) : ""), [compare]);

  function copy() {
    navigator.clipboard.writeText(proposal.output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function refine() {
    if (!refinePrompt.trim() || proposal.streaming) return;
    const selection = window.getSelection()?.toString() || "";
    onRefine(refinePrompt.trim(), selection);
    setRefinePrompt("");
  }

  const meta = STATUS_META[proposal.status] || STATUS_META.draft;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <button className="btn btn-ghost" onClick={onBack}><i className="ti ti-arrow-left" /></button>
          <div className="topbar-title">{proposal.title || "Document"}</div>
          <span className={"status " + meta.cls}><i className={"ti " + meta.icon} /> {meta.label}</span>
        </div>
        <div className="topbar-right">
          <button className="btn btn-outline" onClick={copy} disabled={proposal.streaming}>
            <i className={"ti " + (copied ? "ti-check" : "ti-copy")} /> {copied ? "Copied!" : "Copy"}
          </button>
          <a
            className="btn btn-outline"
            href={proposal.id ? `/api/proposals/${proposal.id}/export` : "#"}
            style={proposal.streaming || !proposal.id ? { pointerEvents: "none", opacity: 0.5 } : undefined}
          >
            <i className="ti ti-file-type-docx" /> .docx
          </a>
          <a
            className="btn btn-outline"
            href={proposal.id ? `/api/proposals/${proposal.id}/export?format=pdf` : "#"}
            style={proposal.streaming || !proposal.id ? { pointerEvents: "none", opacity: 0.5 } : undefined}
          >
            <i className="ti ti-file-type-pdf" /> PDF
          </a>
        </div>
      </div>

      <div className="page-content">
        <div className="output-layout">
          <div>
            {compare && (
              <div className="banner info" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <span><i className="ti ti-git-compare" /> Comparing current (left) with {compare.label} (right)</span>
                <button className="btn btn-ghost" onClick={() => setCompare(null)} style={{ padding: "2px 8px" }}><i className="ti ti-x" /> Close</button>
              </div>
            )}
            {proposal.streaming ? (
              <div className="output-doc streaming">
                {proposal.output || <span style={{ color: "var(--text-muted)" }}>Drafting…</span>}
                <span className="spinner-ring" style={{ marginLeft: 8, verticalAlign: "middle" }} />
              </div>
            ) : compare ? (
              <div className="split-2">
                <div className="output-doc markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
                <div className="output-doc markdown-body" dangerouslySetInnerHTML={{ __html: compareHtml }} />
              </div>
            ) : (
              <div className="output-doc markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
            )}
          </div>

          <div className="output-sidebar">
            <div className="output-side-card">
              <div className="output-side-title"><i className="ti ti-wand" /> Refine a section</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                Optionally highlight text in the draft, then describe the change.
              </div>
              <textarea
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                placeholder="e.g. Make the risk section more specific to low-connectivity districts; add a phased rollout table."
                style={{ width: "100%", minHeight: 90, fontSize: 13, fontFamily: "Inter, sans-serif", padding: "9px 12px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg-page)", resize: "vertical" }}
              />
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={proposal.streaming || !proposal.id} onClick={refine}>
                <i className="ti ti-refresh" /> Refine draft
              </button>
            </div>

            <div className="output-side-card">
              <div className="output-side-title"><i className="ti ti-flag" /> Outcome</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(["in_review", "won", "lost"] as const).map((s) => (
                  <button
                    key={s}
                    className={"btn " + (proposal.status === s ? "btn-teal" : "btn-outline")}
                    style={{ justifyContent: "flex-start" }}
                    disabled={!proposal.id}
                    onClick={() => onSetStatus(s)}
                  >
                    <i className={"ti " + STATUS_META[s].icon} /> {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </div>

            {proposal.id && !proposal.streaming && (
              <VersionHistory
                proposalId={proposal.id}
                refreshKey={refreshKey}
                onRestore={onRestore}
                onCompare={(content, label) => setCompare({ content, label })}
              />
            )}

            {proposal.rfpLoaded && (
              <div className="output-side-card">
                <div className="output-side-title"><i className="ti ti-file-search" /> RFP grounded</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  This draft was generated against your uploaded RFP.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
