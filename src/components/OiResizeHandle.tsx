"use client";

import { useCallback, useEffect } from "react";

// Drag handle for the output-view "Generation inputs" panel. Dragging updates the
// shared --oi-width CSS variable on :root, which both the fixed panel (its width)
// and the document's page-content (its left padding) read — so the user can shrink
// the inputs panel and give the document more room. Width is clamped and persisted
// to localStorage so it survives navigation.
const MIN = 300;
const MAX = 760;

export default function OiResizeHandle() {
  // Restore the last width the user set (clamped) when the panel mounts.
  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem("oiWidth") || "", 10);
      if (saved) {
        const w = Math.min(MAX, Math.max(MIN, saved));
        document.documentElement.style.setProperty("--oi-width", w + "px");
      }
    } catch {}
  }, []);

  const onDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const panel = (e.currentTarget as HTMLElement).closest(".oi-inputs") as HTMLElement | null;
    // The panel is docked to the right: its right edge is fixed, so dragging the
    // (left-edge) handle leftward widens it — width = fixed right edge − cursor X.
    const right = panel ? panel.getBoundingClientRect().right : window.innerWidth;
    const root = document.documentElement;

    const onMove = (ev: MouseEvent) => {
      const w = Math.min(MAX, Math.max(MIN, Math.round(right - ev.clientX)));
      root.style.setProperty("--oi-width", w + "px");
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      try {
        localStorage.setItem("oiWidth", getComputedStyle(root).getPropertyValue("--oi-width").trim());
      } catch {}
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return <div className="oi-resize" onMouseDown={onDown} title="Drag to resize" role="separator" aria-orientation="vertical" />;
}
