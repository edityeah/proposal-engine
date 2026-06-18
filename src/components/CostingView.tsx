"use client";

import { useEffect, useState } from "react";

interface Result {
  revenueCr: number;
  cm1Cr: number;
  cm1Pct: number;
  overheadCr: number;
  partnerOverheadCr: number;
  cm2Cr: number;
  cm2Pct: number;
  estimatedRevenue: boolean;
  lines: { label: string; amountCr: number }[];
}

export default function CostingView() {
  const [budget, setBudget] = useState("16.08");
  const [schools, setSchools] = useState("15000");
  const [students, setStudents] = useState("");
  const [years, setYears] = useState("2");
  const [viaPartner, setViaPartner] = useState(true);
  const [res, setRes] = useState<Result | null>(null);

  async function calc() {
    const r = await fetch("/api/costing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgetCr: budget, schools, students, durationYears: years, viaPartner,
      }),
    });
    const d = await r.json();
    setRes(d.result);
  }
  useEffect(() => { calc(); /* eslint-disable-next-line */ }, []);

  return (
    <>
      <div className="topbar"><div className="topbar-left"><div className="topbar-title">Costing templates</div></div></div>
      <div className="page-content">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title"><i className="ti ti-calculator" /> Inputs</div></div>
            <div className="grid-2">
              <div className="field"><label>Budget (₹ Cr)</label><input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="leave blank to estimate" /></div>
              <div className="field"><label>Schools</label><input type="number" value={schools} onChange={(e) => setSchools(e.target.value)} /></div>
              <div className="field"><label>Students</label><input type="number" value={students} onChange={(e) => setStudents(e.target.value)} /></div>
              <div className="field"><label>Duration (years)</label><input type="number" value={years} onChange={(e) => setYears(e.target.value)} /></div>
            </div>
            <label className="module-check-item" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={viaPartner} onChange={(e) => setViaPartner(e.target.checked)} />
              <span className="mod-name">Routed via CPSU / implementing partner (adds overhead)</span>
            </label>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={calc}><i className="ti ti-refresh" /> Recalculate</button>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title"><i className="ti ti-report-money" /> CM2 estimate</div></div>
            {res && (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div className="metric-card" style={{ flex: 1, margin: 0 }}>
                    <div className="metric-label">Revenue{res.estimatedRevenue ? " (est.)" : ""}</div>
                    <div className="metric-value" style={{ fontSize: 20 }}>₹{res.revenueCr} Cr</div>
                  </div>
                  <div className="metric-card" style={{ flex: 1, margin: 0 }}>
                    <div className="metric-label">CM2</div>
                    <div className="metric-value" style={{ fontSize: 20, color: res.cm2Pct >= 35 ? "var(--teal-700)" : "var(--danger-text)" }}>{res.cm2Pct}%</div>
                    <div className="metric-sub">₹{res.cm2Cr} Cr</div>
                  </div>
                </div>
                <table className="data-table">
                  <tbody>
                    {res.lines.map((l) => (
                      <tr key={l.label}><td>{l.label}</td><td style={{ textAlign: "right" }}>₹{l.amountCr} Cr</td></tr>
                    ))}
                    <tr><td><strong>CM1</strong></td><td style={{ textAlign: "right" }}><strong>₹{res.cm1Cr} Cr ({res.cm1Pct}%)</strong></td></tr>
                    <tr><td>Overheads</td><td style={{ textAlign: "right" }}>₹{res.overheadCr} Cr</td></tr>
                    <tr><td><strong>CM2</strong></td><td style={{ textAlign: "right" }}><strong>₹{res.cm2Cr} Cr ({res.cm2Pct}%)</strong></td></tr>
                  </tbody>
                </table>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
                  Illustrative percentage model. The same engine feeds the “CM2 margin analysis” document generator.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
