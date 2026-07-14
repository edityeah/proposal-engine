"use client";

import { useEffect, useState } from "react";

interface Bucket { name: string; total: number; won: number }
interface Month { key: string; label: string; total: number; won: number; lost: number; inReview: number; winRate: number }
interface Data {
  totals: { total: number; won: number; lost: number; winRate: number; inReview: number };
  byState: Bucket[];
  byProduct: Bucket[];
  byGenerator: Bucket[];
  monthly: Month[];
}

// Status colours (paired with labels everywhere — never colour-alone).
const C_WON = "#1A7A72";
const C_LOST = "#A32020";
const C_REVIEW = "#7A7AB8";

type Tip = { x: number; y: number; text: string } | null;

function WinLossDonut({
  totals,
  onTip,
}: {
  totals: Data["totals"];
  onTip: (e: React.MouseEvent | null, text?: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const segs = [
    { key: "won", label: "Won", value: totals.won, color: C_WON },
    { key: "lost", label: "Lost", value: totals.lost, color: C_LOST },
    { key: "review", label: "In review", value: totals.inReview, color: C_REVIEW },
  ].filter((s) => s.value > 0);
  const sum = segs.reduce((n, s) => n + s.value, 0) || 1;
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const SW = 22;
  let offset = 0;

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Win / loss</div></div>
      <div className="donut-wrap">
        <svg viewBox="0 0 140 140" className="donut" role="img" aria-label={`Win rate ${totals.winRate}%`}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--bg-page)" strokeWidth={SW} />
          {segs.map((s) => {
            const len = (s.value / sum) * CIRC;
            const gap = segs.length > 1 ? 2 : 0;
            const node = (
              <circle
                key={s.key}
                cx="70" cy="70" r={R} fill="none"
                stroke={s.color}
                strokeWidth={hover === s.key ? SW + 3 : SW}
                strokeDasharray={`${Math.max(0, len - gap)} ${CIRC - Math.max(0, len - gap)}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
                opacity={hover && hover !== s.key ? 0.35 : 1}
                style={{ transition: "opacity .12s, stroke-width .12s", cursor: "pointer" }}
                onMouseEnter={(e) => { setHover(s.key); onTip(e, `${s.label}: ${s.value}`); }}
                onMouseMove={(e) => onTip(e, `${s.label}: ${s.value}`)}
                onMouseLeave={() => { setHover(null); onTip(null); }}
              />
            );
            offset += len;
            return node;
          })}
          <text x="70" y="67" textAnchor="middle" className="donut-num">{totals.winRate}%</text>
          <text x="70" y="85" textAnchor="middle" className="donut-lbl">WIN RATE</text>
        </svg>
        <div className="donut-legend">
          {segs.map((s) => (
            <div
              key={s.key}
              className={"legend-row" + (hover === s.key ? " hot" : "")}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="legend-dot" style={{ background: s.color }} />
              <span className="legend-label">{s.label}</span>
              <span className="legend-val">{s.value}</span>
            </div>
          ))}
          <div className="legend-foot">{totals.winRate}% of decided bids won</div>
        </div>
      </div>
    </div>
  );
}

function BarChart({
  title,
  rows,
  onTip,
}: {
  title: string;
  rows: Bucket[];
  onTip: (e: React.MouseEvent | null, text?: string) => void;
}) {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...sorted.map((r) => r.total));

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">{title}</div></div>
      {sorted.length === 0 ? (
        <div className="chart-empty">No data yet.</div>
      ) : (
        <div className="bars">
          {sorted.map((r) => {
            const wonPct = r.total ? (r.won / r.total) * 100 : 0;
            const tip = `${r.name} — ${r.won} won of ${r.total}`;
            return (
              <div
                key={r.name}
                className="bar-row"
                onMouseEnter={(e) => onTip(e, tip)}
                onMouseMove={(e) => onTip(e, tip)}
                onMouseLeave={() => onTip(null)}
              >
                <div className="bar-head">
                  <span className="bar-name">{r.name}</span>
                  <span className="bar-meta">{r.won}/{r.total} won</span>
                </div>
                <div className="bar-track" style={{ width: `${(r.total / max) * 100}%` }}>
                  <div className="bar-won" style={{ width: `${wonPct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="bar-legend">
            <span className="legend-dot" style={{ background: C_WON }} /> won
            <span className="legend-dot legend-dot-track" /> total volume
          </div>
        </div>
      )}
    </div>
  );
}

// Stacked monthly outcomes — won / lost / in-review counts per month.
function MonthlyStacked({
  months,
  onTip,
}: {
  months: Month[];
  onTip: (e: React.MouseEvent | null, text?: string) => void;
}) {
  const W = 560, H = 220, padL = 12, padR = 12, padT = 14, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = months.length || 1;
  const maxCount = Math.max(1, ...months.map((m) => m.total));
  const bandW = innerW / n;
  const barW = Math.min(40, bandW * 0.5);
  const y0 = padT + innerH;
  const y = (v: number) => y0 - (v / maxCount) * innerH;
  const hasData = months.some((m) => m.total > 0);

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Monthly outcomes</div></div>
      {!hasData ? (
        <div className="chart-empty">No data yet.</div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="tl-svg" role="img" aria-label="Monthly outcomes">
            {[0, 0.5, 1].map((f) => (
              <line key={f} x1={padL} x2={W - padR} y1={y0 - f * innerH} y2={y0 - f * innerH} stroke="var(--border)" strokeWidth="1" opacity="0.7" />
            ))}
            {months.map((m, i) => {
              const bx = padL + bandW * i + (bandW - barW) / 2;
              const segs = [
                { key: "won", val: m.won, color: C_WON },
                { key: "lost", val: m.lost, color: C_LOST },
                { key: "review", val: m.inReview, color: C_REVIEW },
              ];
              let acc = 0;
              const tip = `${m.label}: ${m.won} won · ${m.lost} lost · ${m.inReview} in review`;
              return (
                <g key={m.key} style={{ cursor: "pointer" }}
                   onMouseEnter={(e) => onTip(e, tip)} onMouseMove={(e) => onTip(e, tip)} onMouseLeave={() => onTip(null)}>
                  <rect x={padL + bandW * i} y={padT} width={bandW} height={innerH} fill="transparent" />
                  {segs.map((s) => {
                    if (s.val <= 0) return null;
                    const yTop = y(acc + s.val);
                    const h = y(acc) - y(acc + s.val);
                    acc += s.val;
                    return <rect key={s.key} x={bx} y={yTop} width={barW} height={Math.max(0, h)} fill={s.color} rx="2" />;
                  })}
                  <text x={padL + bandW * i + bandW / 2} y={H - 8} textAnchor="middle" className="tl-axis">{m.label}</text>
                </g>
              );
            })}
          </svg>
          <div className="bar-legend">
            <span className="legend-dot" style={{ background: C_WON }} /> won
            <span className="legend-dot" style={{ background: C_LOST }} /> lost
            <span className="legend-dot" style={{ background: C_REVIEW }} /> in review
          </div>
        </>
      )}
    </div>
  );
}

// Win-rate % over the last months as a smooth area + line, with hover dots.
function WinRateArea({
  months,
  onTip,
}: {
  months: Month[];
  onTip: (e: React.MouseEvent | null, text?: string) => void;
}) {
  const W = 560, H = 220, padL = 12, padR = 30, padT = 16, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = months.length;
  const y0 = padT + innerH;
  const x = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);
  const y = (v: number) => y0 - (v / 100) * innerH;
  const pts = months.map((m, i) => ({ x: x(i), y: y(m.winRate), m }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const area = pts.length ? `${line} L${pts[pts.length - 1].x},${y0} L${pts[0].x},${y0} Z` : "";
  const hasData = months.some((m) => m.won + m.lost > 0);

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Win-rate trend</div></div>
      {!hasData ? (
        <div className="chart-empty">No decided bids yet.</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="tl-svg" role="img" aria-label="Win-rate trend">
          <defs>
            <linearGradient id="wrGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C_WON} stopOpacity="0.28" />
              <stop offset="100%" stopColor={C_WON} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" opacity="0.7" />
              <text x={W - padR + 5} y={y(v) + 4} textAnchor="start" className="tl-axis">{v}%</text>
            </g>
          ))}
          <path d={area} fill="url(#wrGrad)" />
          <path d={line} fill="none" stroke={C_WON} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => {
            const tip = `${p.m.label}: ${p.m.winRate}% win rate (${p.m.won}/${p.m.won + p.m.lost} decided)`;
            return (
              <g key={i} style={{ cursor: "pointer" }}
                 onMouseEnter={(e) => onTip(e, tip)} onMouseMove={(e) => onTip(e, tip)} onMouseLeave={() => onTip(null)}>
                <circle cx={p.x} cy={p.y} r="9" fill="transparent" />
                <circle cx={p.x} cy={p.y} r="3.5" fill="var(--bg-card)" stroke={C_WON} strokeWidth="2" />
                <text x={p.x} y={H - 8} textAnchor="middle" className="tl-axis">{p.m.label}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export default function AnalyticsView() {
  const [data, setData] = useState<Data | null>(null);
  const [tip, setTip] = useState<Tip>(null);

  useEffect(() => { fetch("/api/analytics").then((r) => r.json()).then(setData); }, []);

  // Shared cursor-following tooltip for all charts.
  function onTip(e: React.MouseEvent | null, text?: string) {
    if (!e || !text) { setTip(null); return; }
    setTip({ x: e.clientX, y: e.clientY, text });
  }

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
              <MonthlyStacked months={data.monthly} onTip={onTip} />
              <WinRateArea months={data.monthly} onTip={onTip} />
            </div>
            <div className="split-2">
              <WinLossDonut totals={data.totals} onTip={onTip} />
              <BarChart title="By state" rows={data.byState} onTip={onTip} />
            </div>
            <div className="split-2">
              <BarChart title="By product" rows={data.byProduct} onTip={onTip} />
              <BarChart title="By document type" rows={data.byGenerator} onTip={onTip} />
            </div>
          </>
        )}
      </div>
      {tip && (
        <div className="chart-tip" style={{ left: tip.x + 14, top: tip.y + 14 }}>{tip.text}</div>
      )}
    </>
  );
}
