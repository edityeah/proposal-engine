"use client";

import { useEffect, useState } from "react";

interface Row {
  id: string;
  title: string;
  state: string | null;
  generatorLabel: string | null;
  status: string;
  createdAt: string;
}
interface Metrics {
  total: number;
  won: number;
  inReview: number;
  states: number;
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

export default function HistoryView({ onOpen }: { onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({ total: 0, won: 0, inReview: 0, states: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/proposals")
      .then((r) => r.json())
      .then((d) => {
        setRows(d.proposals || []);
        setMetrics(d.metrics || { total: 0, won: 0, inReview: 0, states: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><div className="topbar-title">History</div></div>
      </div>
      <div className="page-content">
        <div className="metric-grid">
          <div className="metric-card"><div className="metric-label"><i className="ti ti-files" /> Total documents</div><div className="metric-value">{metrics.total}</div></div>
          <div className="metric-card"><div className="metric-label"><i className="ti ti-trophy" /> Won</div><div className="metric-value">{metrics.won}</div></div>
          <div className="metric-card"><div className="metric-label"><i className="ti ti-eye" /> In review</div><div className="metric-value">{metrics.inReview}</div></div>
          <div className="metric-card"><div className="metric-label"><i className="ti ti-map" /> States</div><div className="metric-value">{metrics.states}</div></div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr><th>Document</th><th>State</th><th>Type</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24 }}><span className="spinner-ring" /></td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No documents yet — generate your first proposal.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} onClick={() => onOpen(r.id)}>
                  <td><div className="doc-name"><i className="ti ti-file-text" style={{ color: "var(--navy-700)" }} /> {r.title}</div></td>
                  <td>{r.state || "—"}</td>
                  <td>{r.generatorLabel || "—"}</td>
                  <td><span className={"status " + (STATUS_CLS[r.status] || "status-draft")}>{STATUS_LABEL[r.status] || r.status}</span></td>
                  <td>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
