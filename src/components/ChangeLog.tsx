"use client";

// A running timeline of changes to the engine. Each entry: date, changes, done-by.
export interface Entry {
  date: string;
  doneBy: string;
  changes: string[];
}

export const CHANGELOG: Entry[] = [
  {
    date: "14 Jul 2026",
    doneBy: "Om",
    changes: [
      "Document comments (Google-Docs style) — select any text in a document, click Comment, write it, and address it to a teammate (“For:”). Anyone who can open the doc sees it; a Comments drawer lists them all and clicking one jumps to the text and flashes a highlight; resolve or delete inline.",
      "Web Sources chip — a chip in the chat’s top-right lists every web link used in the conversation; now persisted, so it stays when you reopen a chat, and any cited link shows up (not just tool sources).",
      "RFP response type — choosing “RFP response” now asks Technical / Financial / Both (both in the Generate form and mid-chat), and the draft is scoped to match.",
      "Inception-report ingestion — upload a long inception report and it’s distilled into reusable patterns: section-level knowledge chunks + curated guidance, never lifting specific figures (placeholders instead).",
      "Stronger PAB notes — the PAB note now enforces a costing table (component → units → unit cost → total → ₹ lakhs, tagged R/NR, mapped to a PAB head) and requires every statistic to carry source + year or an [INSERT] placeholder. One-click “Seed PAB guidance” in the Curation Studio.",
      "The “let AI choose the model?” prompt now appears only once, ever — not on every new chat.",
      "Document outline — a floating, transparent section outline in the open document (starts collapsed; click to open). Click a heading to jump to it, and it highlights the section you’re scrolled to. Opening a document also auto-collapses the left navigation to give the doc more room.",
      "Star your documents — star any doc from My Docs or the document’s top bar; a new “Starred” filter shows just those (they still appear under All too).",
      "Upload & learn now saves — the uploaded document is actually stored in the Knowledge Base (Won → winning proposal, Lost → losing proposal), and the AI reads the first pages to auto-fill the document type, title, state and tags (you just set Won/Lost). State is now a proper Indian-states dropdown.",
      "Upload RFP — the RFP library now has its own upload: add a tender straight into the library (title, state, tags), searchable and re-attachable.",
      "The distil / “learn” agent now runs on Claude by default (no Gemini key needed).",
      "Default theme is now Orange, and the accent picker labels it “Orange”. Post-login workspace cards show a filled button that turns outline on hover.",
    ],
  },
  {
    date: "13 Jul 2026",
    doneBy: "Om",
    changes: [
      "Auto AI Model — a toggle beside the model picker that lets the assistant pick the best model for each message (a fast one for quick questions, the strongest for full drafts). One-time consent, and each reply shows which model ran.",
      "Human-friendly model picker — models are grouped by provider with plain-language hints (“best for full RFP responses”, “fastest — short answers”) instead of technical labels.",
      "Notify-when-ready — a chime, a browser notification and a tab-title flash fire when a document finishes generating; the “notify me” chip sits neatly beside the loader.",
      "Generated-documents chip — a chip in the chat’s top-right lists every document created in that chat (name + time) and reopens it in the split view.",
      "Quick-reply chips — when the assistant offers you a choice, tappable option chips appear beneath the reply (plus an “Other” chip).",
      "Login photobooth — the red shutter now opens a full-screen capture booth with the live webcam, a big 3-2-1 countdown and a “say cheese!” prompt before it prints the polaroid.",
    ],
  },
  {
    date: "10 Jul 2026",
    doneBy: "Om",
    changes: [
      "Profile & settings — click your name (bottom-left) to open a settings overlay with Profile and Appearance tabs.",
      "Themes — pick an accent colour (Neutral, Blue, Violet, Green, Amber) that recolours buttons, badges and highlights across the dashboard; light/dark lives here too.",
      "Highlight-to-ask — select text in a document for a slim AI corrector bar (Enhance / Concise / Formal, or type an instruction) that refines just that selection in the Co-Pilot.",
      "Dark mode — documents and their thumbnails always stay light paper; only the surrounding app goes dark.",
      "The Generation inputs + Co-Pilot panel now docks on the right, with the inputs collapsed into a compact snapshot (pencil → edit overlay).",
      "Win/loss analytics — added monthly-outcomes and win-rate-trend charts.",
      "Fixed the grey strip / floating composer at the bottom of the page (a 90%-zoom sizing bug).",
      "RFP library — click any RFP to open a full document viewer with a grounded “Ask Co-Pilot” (split screen).",
      "Uploaded RFPs now auto-save into the RFP library, and the library has its own “Know about me”.",
      "“Ask Co-Pilot” in My Docs is now a full-height panel docked to the right (matches the RFP viewer); the button sits top-right.",
      "The whole app renders at 90% zoom for tighter, cleaner text.",
      "Added this Change Log.",
    ],
  },
  {
    date: "09 Jul 2026",
    doneBy: "Om",
    changes: [
      "Recovered the corrupt local database (PGlite WAL recovery) — proposals, RFPs and admin prompts restored.",
      "Login screen — vintage Polaroid photobooth: live webcam in the lens, flash on capture, the polaroid prints out and auto-downloads, one-click 3-2-1 timer.",
      "Login — “The Proposal Engine” hero with an illustration; film-grain background.",
      "Welcome screen — “Features” scrolling marquee, curved-loop feature backdrop, cursor-following card glow, and a blue-heart footer.",
      "Documents — Co-Pilot split screen that stays open, a resizable “Generation inputs” panel, and a working “Save to My Docs”.",
    ],
  },
];

export default function ChangeLog() {
  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-title"><i className="ti ti-history" /> Change Log</div>
        </div>
      </div>
      <div className="page-content">
        <div className="cl-wrap">
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
        </div>
      </div>
    </>
  );
}
