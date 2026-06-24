"use client";

const USE_CASES = [
  { icon: "ti-box", name: "Product Distribution", desc: "Explainer decks, campaign collateral, training material, update notes", phase: "Phase 2", soon: true },
  { icon: "ti-brand-instagram", name: "Social Media", desc: "Posts, carousels, stories, thumbnails — channel-ready, on-brand", phase: "Phase 2", soon: true },
  { icon: "ti-bulb", name: "Thought Leadership", desc: "Op-eds, abstracts, positioning, white-paper outlines", phase: "Later" },
  { icon: "ti-confetti", name: "Events", desc: "Standees, backdrops, shoot plans, giveaways, run-of-show", phase: "Later" },
  { icon: "ti-presentation", name: "BizDev Pitches", desc: "Partnership decks, capability statements, one-pagers", phase: "Later" },
  { icon: "ti-chart-arrows", name: "Impact Updates", desc: "Funder/partner impact decks, reports, highlight reels", phase: "Later" },
  { icon: "ti-news", name: "General Content", desc: "Case studies, blogs, press releases, outreach", phase: "Later" },
];

export default function MarketingStudio() {
  return (
    <>
      <div className="topbar"><div className="topbar-left"><div className="topbar-title">Marketing studio</div></div></div>
      <div className="page-content">
        <div className="banner info" style={{ marginBottom: 18 }}>
          <i className="ti ti-palette" />
          <div>
            Produce <strong>finished, on-brand marketing collateral</strong> — branded <strong>PPT decks</strong>, <strong>images</strong>, <strong>carousels</strong>, and <strong>backdrops</strong> — generated from CG&apos;s brand grammar and the live intelligence backbone, scoped to your state. Building now; <strong>Product Distribution</strong> and <strong>Social Media</strong> come first.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {USE_CASES.map((u) => (
            <div key={u.name} className="card" style={{ margin: 0, opacity: u.soon ? 1 : 0.7 }}>
              <div className="card-title"><i className={"ti " + u.icon} /> {u.name}</div>
              <p style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary)" }}>{u.desc}</p>
              <span className={"tag " + (u.soon ? "tag-teal" : "")} style={{ marginTop: 10, display: "inline-flex" }}>{u.phase}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
