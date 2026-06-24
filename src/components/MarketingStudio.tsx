"use client";

import { useEffect, useState } from "react";
import { BRAND_LIST, type Brand } from "@/config/brand";

const USE_CASES = [
  { id: "product_distribution", icon: "ti-box", name: "Product Distribution", desc: "Explainer decks, campaign collateral, training material, update notes", phase: "Live", active: true },
  { id: "social", icon: "ti-brand-instagram", name: "Social Media", desc: "Posts, carousels, stories, thumbnails — channel-ready, on-brand", phase: "Next", soon: true },
  { id: "thought", icon: "ti-bulb", name: "Thought Leadership", desc: "Op-eds, abstracts, positioning, white-paper outlines", phase: "Later" },
  { id: "events", icon: "ti-confetti", name: "Events", desc: "Standees, backdrops, shoot plans, giveaways, run-of-show", phase: "Later" },
  { id: "bizdev", icon: "ti-presentation", name: "BizDev Pitches", desc: "Partnership decks, capability statements, one-pagers", phase: "Later" },
  { id: "impact", icon: "ti-chart-arrows", name: "Impact Updates", desc: "Funder/partner impact decks, reports, highlight reels", phase: "Later" },
  { id: "general", icon: "ti-news", name: "General Content", desc: "Case studies, blogs, press releases, outreach", phase: "Later" },
];

interface AssetRow {
  id: string;
  brand: string;
  type: string;
  title: string;
  blobUrl: string | null;
  filename: string | null;
  createdAt: string;
}

export default function MarketingStudio() {
  const [view, setView] = useState<"grid" | "deck">("grid");
  const [assets, setAssets] = useState<AssetRow[]>([]);

  useEffect(() => {
    fetch("/api/marketing/deck")
      .then((r) => (r.ok ? r.json() : { assets: [] }))
      .then((d) => setAssets(d.assets ?? []))
      .catch(() => {});
  }, [view]);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          {view === "deck" && (
            <button className="btn btn-ghost" onClick={() => setView("grid")} style={{ marginRight: 8 }}>
              <i className="ti ti-arrow-left" /> Back
            </button>
          )}
          <div className="topbar-title">{view === "deck" ? "Product Distribution deck" : "Marketing studio"}</div>
        </div>
      </div>

      <div className="page-content">
        {view === "grid" && <Grid onOpen={(id) => id === "product_distribution" && setView("deck")} assets={assets} />}
        {view === "deck" && <DeckForm onDone={() => setView("grid")} />}
      </div>
    </>
  );
}

function Grid({ onOpen, assets }: { onOpen: (id: string) => void; assets: AssetRow[] }) {
  return (
    <>
      <div className="banner info" style={{ marginBottom: 18 }}>
        <i className="ti ti-palette" />
        <div>
          Produce <strong>finished, on-brand collateral</strong> — branded <strong>PPT decks</strong>, images, carousels and backdrops — from CG&apos;s brand grammar, scoped to your state. <strong>Product Distribution</strong> decks are live; <strong>Social Media</strong> is next.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {USE_CASES.map((u) => (
          <div
            key={u.id}
            className="card"
            style={{ margin: 0, opacity: u.active ? 1 : u.soon ? 0.85 : 0.6, cursor: u.active ? "pointer" : "default" }}
            onClick={() => u.active && onOpen(u.id)}
          >
            <div className="card-title"><i className={"ti " + u.icon} /> {u.name}</div>
            <p style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary)" }}>{u.desc}</p>
            <span className={"tag " + (u.active ? "tag-teal" : "")} style={{ marginTop: 10, display: "inline-flex" }}>
              {u.active && <i className="ti ti-bolt" style={{ marginRight: 3 }} />}{u.phase}
            </span>
          </div>
        ))}
      </div>

      {assets.length > 0 && (
        <>
          <div className="section-label" style={{ marginTop: 28, marginBottom: 10 }}>Recent assets</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {assets.map((a) => (
              <div key={a.id} className="card" style={{ margin: 0, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                <i className="ti ti-file-type-ppt" style={{ fontSize: 20, color: "var(--navy-600)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-hint)" }}>{a.brand} · {a.type} · {new Date(a.createdAt).toLocaleDateString()}</div>
                </div>
                {a.blobUrl && (
                  <a className="btn btn-ghost" href={a.blobUrl} download>
                    <i className="ti ti-download" /> Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function DeckForm({ onDone }: { onDone: () => void }) {
  const [brandId, setBrandId] = useState<Brand["id"]>("convegenius");
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [slideCount, setSlideCount] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; url: string | null; slides: number } | null>(null);

  const brand = BRAND_LIST.find((b) => b.id === brandId)!;

  async function generate() {
    setError(null);
    setResult(null);
    if (!topic.trim() || !audience.trim()) {
      setError("Topic and audience are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/marketing/deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId, topic, audience, keyPoints, slideCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="card" style={{ margin: 0, maxWidth: 620 }}>
        <div className="banner success">
          <i className="ti ti-circle-check" />
          <div>Deck ready — <strong>{result.title}</strong> ({result.slides} slides), branded for {brand.name}.</div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {result.url && (
            <a className="btn btn-primary" href={result.url} download>
              <i className="ti ti-download" /> Download .pptx
            </a>
          )}
          <button className="btn btn-ghost" onClick={() => setResult(null)}>
            <i className="ti ti-plus" /> Generate another
          </button>
          <button className="btn btn-ghost" onClick={onDone}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ margin: 0, maxWidth: 620, display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="field">
        <label><i className="ti ti-palette" /> Brand</label>
        <div style={{ display: "flex", gap: 8 }}>
          {BRAND_LIST.map((b) => (
            <button
              key={b.id}
              type="button"
              className={"btn " + (brandId === b.id ? "btn-primary" : "btn-ghost")}
              onClick={() => setBrandId(b.id)}
            >
              {b.name}{b.provisional ? " *" : ""}
            </button>
          ))}
        </div>
        {brand.provisional && <div className="hint"><i className="ti ti-info-circle" /> {brand.name} brand values are provisional, pending the locked master.</div>}
      </div>

      <div className="field">
        <label>Topic <span className="req">*</span></label>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder='e.g. "SwiftChat for Government Schools in Uttar Pradesh"' />
      </div>

      <div className="field">
        <label>Audience <span className="req">*</span></label>
        <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder='e.g. "State education department officials"' />
      </div>

      <div className="field">
        <label>Key points to cover <span style={{ color: "var(--text-hint)", fontWeight: 400 }}>(optional)</span></label>
        <textarea value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)} placeholder="Anything specific the deck must include — features, outcomes, proof points…" />
      </div>

      <div className="field" style={{ maxWidth: 220 }}>
        <label>Content slides</label>
        <select value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))}>
          {[4, 5, 6, 7, 8, 10].map((n) => <option key={n} value={n}>{n} slides</option>)}
        </select>
      </div>

      {error && <div className="banner" style={{ background: "var(--danger-bg)", color: "var(--danger-text)", borderColor: "var(--danger-border)" }}><i className="ti ti-alert-triangle" /> {error}</div>}

      <div>
        <button className="btn btn-primary" onClick={generate} disabled={busy}>
          {busy ? <><i className="ti ti-loader-2 spin" /> Generating deck…</> : <><i className="ti ti-sparkles" /> Generate branded deck</>}
        </button>
      </div>
    </div>
  );
}
