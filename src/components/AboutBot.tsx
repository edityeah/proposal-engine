"use client";

import { useEffect, useState } from "react";
import { CHANGELOG } from "./ChangeLog";

const DOC_TYPES = ["Proposal", "PAB note", "RFP response", "Concept note", "Executive summary", "CM2 analysis"];

const STEPS = [
  { icon: "ti-search", title: "Research", desc: "Live web + your knowledge base — tenders, budgets, schemes, competitors. Every claim cited." },
  { icon: "ti-sparkles", title: "Draft", desc: "A short brief becomes a complete, structured, costed, evidence-led document." },
  { icon: "ti-wand", title: "Refine", desc: "Ask the Co-Pilot to tighten, add metrics, or rewrite any highlighted line — grounded in the doc." },
  { icon: "ti-chart-line", title: "Track & learn", desc: "Mark Won / Lost, watch win-rate trends, and I learn from every outcome." },
];

const FEATURES = [
  { icon: "ti-search", title: "Research intelligence", desc: "Ask about live RFPs, state budgets, schemes and competitors — answered from the web and your KB, with sources." },
  { icon: "ti-file-text", title: "Document generation", desc: "Proposals, PAB notes, RFP responses, concept notes, executive summaries and CM2 analyses — PAB-ready." },
  { icon: "ti-message-2-bolt", title: "Ask Co-Pilot", desc: "Refine the whole document or just a highlighted sentence; attach a reference to ground the edit." },
  { icon: "ti-folder", title: "RFP library", desc: "Upload an RFP, read it in a viewer, and ask a Co-Pilot grounded in that exact document." },
  { icon: "ti-chart-pie", title: "Win / loss analytics", desc: "Win rate by state, product and document type, plus monthly-outcome and win-rate trends." },
  { icon: "ti-brain", title: "Grounded in your wins", desc: "Every draft is anchored in your own winning proposals — your voice, your evidence, your numbers." },
];

const PRINCIPLES = [
  { icon: "ti-123", title: "Quantified", desc: "Every claim leads with magnitude — a number wherever one exists." },
  { icon: "ti-quote", title: "Evidence-led", desc: "National assessments cited with source + year — NAS 2021, PARAKH 2024, UDISE+." },
  { icon: "ti-coin-rupee", title: "Costed to the PAB", desc: "Every rupee maps to a budget head: component → units → rate → total, tagged R / NR." },
  { icon: "ti-building-bank", title: "Government register", desc: "Measured, institutional, third-person — the tone a PAB note expects." },
];

// Auto-AI-model routing, for the "Auto AI model" tab. `tier` decides depth;
// the provider family is Claude in production, OpenAI in Demo mode.
const AUTO_TIER_RULES = [
  { signal: "A file / attachment is included", tier: "Heavy", eg: "“Summarise this” + an uploaded RFP" },
  { signal: "Drafting or costing intent, or a long message — proposal, RFP, PAB, concept note, executive summary, CM2, costing, budget, “draft”, “generate”…", tier: "Heavy", eg: "“Draft a PAB note for VSK in Bihar”" },
  { signal: "A greeting / acknowledgement, or a very short message", tier: "Light", eg: "“hi”, “thanks”, “ok”" },
  { signal: "Everything else", tier: "Balanced", eg: "“Which states have open FLN tenders?”" },
];
const AUTO_MODELS = [
  { tier: "Heavy", note: "Deepest quality for full drafts & analysis", claude: "Claude Opus 4.8", openai: "GPT-5.5", gemini: "Gemini 2.5 Pro" },
  { tier: "Balanced", note: "Quick drafts, edits & research", claude: "Claude Sonnet 4.6", openai: "GPT-5.4 mini", gemini: "Gemini 2.5 Flash" },
  { tier: "Light", note: "Short answers & quick replies", claude: "Claude Haiku 4.5", openai: "GPT-5.4 nano", gemini: "Gemini 2.0 Flash" },
];

type Tab = "docs" | "versions" | "auto";

export default function AboutBot({ onClose, initialTab = "docs" }: { onClose: () => void; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="about-overlay" onMouseDown={onClose}>
      <div className="about-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="about-close" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>

        {/* Switch between the product documentation and the version history. */}
        <div className="about-tabs">
          <div className="seg-tabs">
            <button className={"seg-tab" + (tab === "docs" ? " active" : "")} onClick={() => setTab("docs")}>
              <i className="ti ti-book" /> Documentation
            </button>
            <button className={"seg-tab" + (tab === "auto" ? " active" : "")} onClick={() => setTab("auto")}>
              <i className="ti ti-sparkles" /> Auto AI model
            </button>
            <button className={"seg-tab" + (tab === "versions" ? " active" : "")} onClick={() => setTab("versions")}>
              <i className="ti ti-history" /> Version histories
            </button>
          </div>
        </div>

        {tab === "auto" ? (
          <section className="about-section about-auto">
            <div className="about-eyebrow">Auto AI model</div>
            <h2 className="about-auto-h">One switch — the engine picks the model for each message.</h2>
            <p className="about-lead">
              Turn on <strong>Auto AI Model</strong> (beside the model picker) and you don&apos;t have to choose. The
              assistant reads each message and routes it to the right model — a fast one for quick questions, the
              strongest for a full draft — so simple turns don&apos;t spend top-tier credits and heavy work still gets
              the best model. Every reply shows an <span className="about-pill"><i className="ti ti-sparkles" /> Auto · &lt;model&gt;</span> tag so you always know which ran.
            </p>

            <div className="about-auto-note">
              <i className="ti ti-info-circle" />
              <div>
                <strong>Two decisions.</strong> The <em>tier</em> (how much horsepower) is chosen from your message, per
                the table below. The <em>provider family</em> is fixed: <strong>Claude in production</strong>, and
                <strong> OpenAI in Demo mode</strong>. Gemini models are configured and ready, but Auto doesn&apos;t
                route to them by conversation yet.
              </div>
            </div>

            <div className="about-eyebrow" style={{ marginTop: 26 }}>How the message picks a tier</div>
            <div className="about-table-wrap">
              <table className="about-table">
                <thead><tr><th>If the message…</th><th>Tier</th><th>Example</th></tr></thead>
                <tbody>
                  {AUTO_TIER_RULES.map((r) => (
                    <tr key={r.signal}>
                      <td>{r.signal}</td>
                      <td><span className={"about-tier t-" + r.tier.toLowerCase()}>{r.tier}</span></td>
                      <td className="about-td-eg">{r.eg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="about-eyebrow" style={{ marginTop: 26 }}>Which model each tier maps to</div>
            <div className="about-table-wrap">
              <table className="about-table">
                <thead><tr><th>Tier</th><th>Claude · prod</th><th>OpenAI · demo</th><th>Gemini · ready</th></tr></thead>
                <tbody>
                  {AUTO_MODELS.map((m) => (
                    <tr key={m.tier}>
                      <td><span className={"about-tier t-" + m.tier.toLowerCase()}>{m.tier}</span><div className="about-td-note">{m.note}</div></td>
                      <td className="about-td-model">{m.claude}</td>
                      <td className="about-td-dim">{m.openai}</td>
                      <td className="about-td-dim">{m.gemini}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="about-auto-foot">
              You can override Auto anytime by picking a specific model from the dropdown — that turns Auto off and
              keeps you on that model for the rest of the chat.
            </p>
          </section>
        ) : tab === "versions" ? (
          <section className="about-section about-versions">
            <div className="about-eyebrow">Version histories</div>
            <p className="cl-intro">A running timeline of what&apos;s changed in the engine — newest first.</p>
            <div className="cl-timeline">
              {CHANGELOG.map((e, i) => (
                <div key={i} className="cl-entry">
                  <div className="cl-marker"><span className="cl-dot" /></div>
                  <div className="cl-content">
                    <div className="cl-head">
                      <span className="cl-date"><i className="ti ti-calendar" /> {e.date}</span>
                      <span className="cl-by"><i className="ti ti-user" /> Done by {e.doneBy}</span>
                    </div>
                    <ul className="cl-changes">
                      {e.changes.map((c, j) => <li key={j}>{c}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
        <>
        <section className="about-hero">
          <div className="about-badge"><i className="ti ti-sparkles" /> The Proposal Engine</div>
          <h1 className="about-h1">I turn a short brief into a complete,<br /> <span>PAB-ready</span> government document.</h1>
          <p className="about-lead">
            Researched from the live web and your winning proposals. Structured, costed to every budget head,
            and cited — ready to review, refine and submit.
          </p>
          <div className="about-chips">
            {DOC_TYPES.map((d) => <span key={d} className="about-chip">{d}</span>)}
          </div>
        </section>

        <section className="about-section">
          <div className="about-eyebrow">How it works</div>
          <div className="about-flow">
            {STEPS.map((s, i) => (
              <div key={s.title} className="about-step">
                <div className="about-step-num">{i + 1}</div>
                <div className="about-step-ic"><i className={"ti " + s.icon} /></div>
                <div className="about-step-title">{s.title}</div>
                <div className="about-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <div className="about-eyebrow">How it all connects</div>
          <div className="about-diagram">
            <div className="dg-pipe">
              <div className="dg-node">
                <div className="dg-node-t"><i className="ti ti-forms" /> Your inputs</div>
                <div className="dg-tags">
                  {["Brief", "RFP", "State & product", "Scale", "Budget"].map((x) => <span key={x} className="dg-tag">{x}</span>)}
                </div>
              </div>
              <div className="dg-arrow"><i className="ti ti-arrow-right" /></div>
              <div className="dg-node dg-engine">
                <div className="dg-node-t"><i className="ti ti-cpu" /> The engine</div>
                <div className="dg-steps">
                  <span className="dg-step"><i className="ti ti-books" /> Retrieve &amp; ground</span>
                  <span className="dg-step"><i className="ti ti-coin-rupee" /> Cost to PAB heads</span>
                  <span className="dg-step"><i className="ti ti-writing" /> Draft &amp; cite</span>
                </div>
              </div>
              <div className="dg-arrow"><i className="ti ti-arrow-right" /></div>
              <div className="dg-node">
                <div className="dg-node-t"><i className="ti ti-file-check" /> PAB-ready doc</div>
                <div className="dg-node-sub">Structured · costed · cited</div>
              </div>
              <div className="dg-arrow"><i className="ti ti-arrow-right" /></div>
              <div className="dg-node">
                <div className="dg-node-t"><i className="ti ti-refresh" /> Refine &amp; track</div>
                <div className="dg-node-sub">Co-Pilot edits · Won / Lost</div>
              </div>
            </div>

            <div className="dg-ground-wrap">
              <div className="dg-feed"><i className="ti ti-arrow-up" /> grounds the engine</div>
              <div className="dg-node dg-ground">
                <div className="dg-node-t"><i className="ti ti-database" /> Grounded in</div>
                <div className="dg-tags">
                  {["Your winning proposals", "Live web", "Knowledge base"].map((x) => <span key={x} className="dg-tag">{x}</span>)}
                </div>
              </div>
            </div>

            <div className="dg-loop">
              <i className="ti ti-arrow-back-up" />
              Every Won / Lost outcome teaches the knowledge base — so the next draft is sharper.
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="about-eyebrow">What I can do</div>
          <div className="about-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="about-card">
                <div className="about-card-ic"><i className={"ti " + f.icon} /></div>
                <div className="about-card-title">{f.title}</div>
                <div className="about-card-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <div className="about-eyebrow">How I write</div>
          <div className="about-principles">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="about-principle">
                <div className="about-principle-ic"><i className={"ti " + p.icon} /></div>
                <div className="about-principle-body">
                  <div className="about-principle-title">{p.title}</div>
                  <div className="about-principle-desc">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <div className="about-eyebrow">A little delight — on the login screen</div>
          <div className="about-camera">
            <div className="about-camera-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vintage-camera.png" alt="Vintage Polaroid photobooth on the login screen" />
            </div>
            <div className="about-camera-body">
              <div className="about-camera-title"><i className="ti ti-camera" /> Polaroid photobooth</div>
              <p>
                A vintage Polaroid sits on the sign-in screen with a live webcam in its lens. Tap the red shutter and a
                full-screen booth opens — your camera fills the screen, a big <strong>3 · 2 · 1</strong> counts down, a
                <strong> “say cheese!”</strong> flashes, and it captures the shot. Fully client-side; nothing is uploaded.
              </p>
              <div className="about-camera-format">
                <div className="acf-title"><i className="ti ti-photo" /> The printed polaroid</div>
                <ul>
                  <li>the <strong>ConveGenius logo</strong> across the top band</li>
                  <li>your <strong>photo</strong> in the middle — square, mirrored like a selfie</li>
                  <li>your <strong>name</strong> with a 🎉 along the bottom</li>
                  <li>a clean white polaroid frame — rendered at full webcam resolution, then <strong>auto-downloaded as a high-res PNG</strong> and shown in a preview you can re-download</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="about-foot">
          <button className="btn btn-primary" onClick={onClose}>Start building <i className="ti ti-arrow-right" /></button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
