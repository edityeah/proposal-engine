"use client";

import { useEffect, useState } from "react";

interface Bucket { name: string; total: number; won: number }
interface Data {
  totals: { total: number; won: number; lost: number; winRate: number; inReview: number };
  byState: Bucket[];
  byProduct: Bucket[];
  byGenerator: Bucket[];
}

function BreakdownCard({ title, rows }: { title: string; rows: Bucket[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">{title}</div></div>
      {rows.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No data yet.</div>}
      {rows.map((r) => (
        <div key={r.name} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
            <span>{r.name}</span>
            <span style={{ color: "var(--text-muted)" }}>{r.total} · {r.won} won</span>
          </div>
          <div style={{ height: 8, background: "var(--bg-page)", borderRadius: 20, overflow: "hidden" }}>
            <div style={{ width: `${(r.total / max) * 100}%`, height: "100%", background: "var(--navy-500)", borderRadius: 20, position: "relative" }}>
              <div style={{ width: `${r.total ? (r.won / r.total) * 100 : 0}%`, height: "100%", background: "var(--teal-700)", borderRadius: 20 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsView() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { fetch("/api/analytics").then((r) => r.json()).then(setData); }, []);

  return (
    <>
      <div className="topbar"><div className="topbar-left"><div className="topbar-title">Win/loss analytics</div></div></div>
      <div className="page-content">
        {!data ? (
          <div className="card"><span className="spinner-ring" /></div>
        ) : (
          <>
            <div className="metric-grid">
              <div className="metric-card"><div className="metric-label"><i className="ti ti-files" /> Total</div><div className="metric-value">{data.totals.total}</div></div>
              <div className="metric-card"><div className="metric-label"><i className="ti ti-trophy" /> Won</div><div className="metric-value">{data.totals.won}</div></div>
              <div className="metric-card"><div className="metric-label"><i className="ti ti-x" /> Lost</div><div className="metric-value">{data.totals.lost}</div></div>
              <div className="metric-card"><div className="metric-label"><i className="ti ti-percentage" /> Win rate</div><div className="metric-value">{data.totals.winRate}%</div><div className="metric-sub">of decided bids</div></div>
            </div>
            <div className="split-2">
              <BreakdownCard title="By state" rows={data.byState} />
              <BreakdownCard title="By product" rows={data.byProduct} />
              <BreakdownCard title="By document type" rows={data.byGenerator} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
              <span style={{ color: "var(--teal-700)" }}>■</span> won portion · <span style={{ color: "var(--navy-500)" }}>■</span> total volume
            </div>
          </>
        )}
      </div>
    </>
  );
}
