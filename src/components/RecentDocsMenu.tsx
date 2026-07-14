"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Doc { id: string; title: string; state: string | null; generatorLabel: string | null; status: string }

// Top-right "My previous generated docs" button on the Generate screen: opens a
// popover of the most recent documents, with a "Show more" link into My docs.
// The popover is portaled to <body> and fixed-positioned under the button so it
// isn't clipped by the scroll container or covered by the Copilot rail.
export default function RecentDocsMenu({
  onOpen,
  onShowMore,
}: {
  onOpen: (id: string) => void;
  onShowMore: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggle() {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/proposals")
      .then((r) => r.json())
      .then((d) => setDocs((d.proposals || []).slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <>
      <button ref={btnRef} className="btn btn-outline" onClick={toggle}>
        <i className="ti ti-files" /> My previous generated docs
      </button>
      {open && pos && createPortal(
        <div className="rd-menu" ref={menuRef} style={{ top: pos.top, right: pos.right }}>
          <div className="rd-head">Recent documents</div>
          <div className="rd-list">
            {loading ? (
              <div className="rd-empty">Loading…</div>
            ) : docs.length === 0 ? (
              <div className="rd-empty">No documents yet.</div>
            ) : (
              docs.map((d) => (
                <button key={d.id} className="rd-item" onClick={() => { setOpen(false); onOpen(d.id); }}>
                  <i className="ti ti-file-text" />
                  <span className="rd-body">
                    <span className="rd-title">{d.title}</span>
                    {(d.generatorLabel || d.state) && (
                      <span className="rd-sub">{[d.generatorLabel, d.state].filter(Boolean).join(" · ")}</span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
          <button className="rd-more" onClick={() => { setOpen(false); onShowMore(); }}>Show more →</button>
        </div>,
        document.body,
      )}
    </>
  );
}
