"use client";

import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import KnowAboutMe from "./KnowAboutMe";

interface Row {
  id: string;
  title: string;
  state: string | null;
  generatorLabel: string | null;
  status: string;
  createdAt: string;
  version?: number;
  output?: string;
  inputs?: { outcomeReason?: string; starred?: boolean } | null;
}

// Render a small slice of the document to markdown for the card thumbnail.
function renderThumb(md: string): string {
  const raw = marked.parse((md || "").slice(0, 800), { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}

const STATUS_CLS: Record<string, string> = {
  draft: "status-draft",
  in_review: "status-in_review",
  won: "status-won",
  lost: "status-lost",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  won: "Won",
  lost: "Lost",
};

// Filter pills shown above the grid (All + Starred + the three outcomes).
// "Starred" is a filter, not a folder — starred docs still appear under All.
const FILTERS: { key: string; label: string; icon?: string }[] = [
  { key: "all", label: "All" },
  { key: "starred", label: "Starred", icon: "ti-star" },
  { key: "in_review", label: "In review" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HistoryView({
  onOpen,
  onNew,
}: {
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/proposals")
      .then((r) => r.json())
      .then((d) => setRows(d.proposals || []))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) {
      c[r.status] = (c[r.status] || 0) + 1;
      if (r.inputs?.starred) c.starred = (c.starred || 0) + 1;
    }
    return c;
  }, [rows]);

  const total = rows.length;
  const won = counts.won || 0;
  const lost = counts.lost || 0;
  const inReview = counts.in_review || 0;
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;

  // Pre-render a scaled document preview (thumbnail) per proposal.
  const thumbs = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of rows) m[r.id] = r.output ? renderThumb(r.output) : "";
    return m;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "all" || (filter === "starred" ? !!r.inputs?.starred : r.status === filter)) &&
        (!q || r.title.toLowerCase().includes(q)),
    );
  }, [rows, query, filter]);

  // Star / unstar — optimistic; persisted to inputs.starred. A doc stays in All.
  function toggleStar(e: React.SyntheticEvent, r: Row) {
    e.stopPropagation();
    const next = !r.inputs?.starred;
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, inputs: { ...(x.inputs || {}), starred: next } } : x)));
    fetch(`/api/proposals/${r.id}/star`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ starred: next }),
    }).catch(() => {});
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><div className="topbar-title">My docs</div></div>
        <div className="topbar-right">
          <KnowAboutMe
            icon="ti-files"
            sub="Every document you've generated, in one place."
            can={[
              "I keep all your generated documents with their status, version history and a live preview — so nothing gets lost.",
              "Marking a document <strong>Won</strong> or <strong>Lost</strong> feeds the knowledge base, so future drafts learn from what actually worked.",
            ]}
            how={[
              "Filter with the tabs (All / In review / Won / Lost) and find a doc with search.",
              "Click a card to open it — refine, export, or restore an earlier version.",
              "Set the outcome on a doc to sharpen future generations.",
            ]}
          />
          <div className="recents-search">
            <i className="ti ti-search" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search proposals"
            />
          </div>
          <button className="btn btn-primary" onClick={onNew}>
            <i className="ti ti-sparkles" /> Generate doc
          </button>
        </div>
      </div>
      <div className="page-content">

      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label"><i className="ti ti-files" /> Total documents</div>
          <div className="metric-value">{total}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label"><i className="ti ti-clock" /> In review</div>
          <div className="metric-value">{inReview}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label"><i className="ti ti-trophy" /> Won</div>
          <div className="metric-value">{won}</div>
          {winRate !== null && <div className="metric-sub">{winRate}% win rate</div>}
        </div>
        <div className="metric-card">
          <div className="metric-label"><i className="ti ti-circle-x" /> Lost</div>
          <div className="metric-value">{lost}</div>
        </div>
      </div>

      <div className="recents-toolbar">
        <div className="seg-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={"seg-tab" + (filter === f.key ? " active" : "")}
              onClick={() => setFilter(f.key)}
            >
              {f.icon && <i className={"ti " + f.icon} style={{ marginRight: 5 }} />}{f.label}
              {f.key === "starred" && (counts.starred || 0) > 0 && <span className="seg-tab-count">{counts.starred}</span>}
            </button>
          ))}
        </div>
        <span className="recents-shown">{visible.length} of {total} shown</span>
      </div>

      {loading ? (
        <div className="recents-empty"><span className="spinner-ring" /></div>
      ) : visible.length === 0 ? (
        <div className="recents-empty">
          {rows.length === 0 ? "No documents yet — generate your first proposal." : "No proposals match."}
        </div>
      ) : (
        <div className="recents-grid">
          {visible.map((r) => (
            <button key={r.id} className="recents-card" onClick={() => onOpen(r.id)}>
              <div className="recents-preview">
                <span className="recents-ver">v{r.version ?? 1}</span>
                <span
                  className={"recents-star" + (r.inputs?.starred ? " on" : "")}
                  role="button"
                  tabIndex={0}
                  title={r.inputs?.starred ? "Unstar" : "Star this document"}
                  onClick={(e) => toggleStar(e, r)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleStar(e, r); } }}
                >
                  <i className={"ti " + (r.inputs?.starred ? "ti-star-filled" : "ti-star")} />
                </span>
                {thumbs[r.id] ? (
                  <div className="recents-thumb" dangerouslySetInnerHTML={{ __html: thumbs[r.id] }} />
                ) : (
                  <div className="recents-thumb-empty"><i className="ti ti-file-text" /></div>
                )}
              </div>
              <div className="recents-card-body">
                <div className="recents-card-title">{r.title}</div>
                <div className="recents-card-meta">
                  <span
                    className={"status " + (STATUS_CLS[r.status] || "status-draft")}
                    title={r.inputs?.outcomeReason || undefined}
                  >
                    <span className="status-dot" />
                    {STATUS_LABEL[r.status] || r.status}
                    {r.inputs?.outcomeReason && <i className="ti ti-message-2 status-note" />}
                  </span>
                  <span className="recents-date">{fmtDate(r.createdAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
