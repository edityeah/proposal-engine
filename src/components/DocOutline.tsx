"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Head { el: HTMLElement; text: string; level: number }

// Google-Docs-style document outline. Reads the live headings out of the
// editable document and renders as an in-flow left column (transparent) so the
// document shifts right beside it — never overlapped. Jumps on click and
// highlights the section you're currently scrolled to. Open state is controlled
// by the parent so the layout can reserve/return the column width.
export default function DocOutline({
  editorRef,
  contentKey,
  open,
  onOpenChange,
  hidden,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  contentKey: string; // changes when the document content is (re)loaded
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hidden?: boolean;
}) {
  const [heads, setHeads] = useState<Head[]>([]);
  const [active, setActive] = useState(0);
  const headsRef = useRef<Head[]>([]);
  headsRef.current = heads;

  const build = useCallback(() => {
    const root = editorRef.current;
    if (!root) { setHeads([]); return; }
    const els = Array.from(root.querySelectorAll<HTMLElement>("h1, h2, h3"));
    setHeads(
      els
        .map((el) => ({ el, text: (el.textContent || "").trim(), level: Number(el.tagName[1]) || 2 }))
        .filter((h) => h.text),
    );
  }, [editorRef]);

  const findScroll = useCallback((): HTMLElement | Window => {
    let n = editorRef.current?.parentElement ?? null;
    while (n) {
      const oy = getComputedStyle(n).overflowY;
      if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 4) return n;
      n = n.parentElement;
    }
    return window;
  }, [editorRef]);

  useEffect(() => {
    const t = setTimeout(build, 80);
    return () => clearTimeout(t);
  }, [contentKey, build]);

  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const mo = new MutationObserver(() => { if (t) clearTimeout(t); t = setTimeout(build, 250); });
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    return () => { mo.disconnect(); if (t) clearTimeout(t); };
  }, [editorRef, build]);

  // Scroll-spy the active section.
  useEffect(() => {
    const scroller = findScroll();
    const spy = () => {
      const trigger = 120;
      let idx = 0;
      headsRef.current.forEach((h, i) => { if (h.el.getBoundingClientRect().top <= trigger) idx = i; });
      setActive(idx);
    };
    spy();
    scroller.addEventListener("scroll", spy, { passive: true });
    window.addEventListener("resize", spy);
    return () => { scroller.removeEventListener("scroll", spy); window.removeEventListener("resize", spy); };
  }, [heads, findScroll]);

  function jump(h: Head) {
    h.el.scrollIntoView({ behavior: "smooth", block: "start" });
    h.el.classList.remove("cg-outline-flash");
    void h.el.offsetWidth;
    h.el.classList.add("cg-outline-flash");
    setTimeout(() => h.el.classList.remove("cg-outline-flash"), 1700);
  }

  if (hidden || heads.length === 0) return null;

  return (
    <div className="doc-outline" data-open={open}>
      {open ? (
        <div className="doc-outline-panel">
          <div className="doc-outline-head">
            <span className="doc-outline-cap"><i className="ti ti-list-tree" /> Outline</span>
            <button className="doc-outline-x" onClick={() => onOpenChange(false)} title="Hide outline"><i className="ti ti-chevron-left" /></button>
          </div>
          <div className="doc-outline-list">
            {heads.map((h, i) => (
              <button
                key={i}
                className={"doc-outline-item" + (h.level >= 3 ? " sub" : "") + (i === active ? " active" : "")}
                onClick={() => jump(h)}
                title={h.text}
              >
                {h.text}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button className="doc-outline-open" onClick={() => onOpenChange(true)} title="Show document outline"><i className="ti ti-list-tree" /> Outline</button>
      )}
    </div>
  );
}
