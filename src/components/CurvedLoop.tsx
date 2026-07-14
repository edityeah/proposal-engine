"use client";

import { useEffect, useId, useRef } from "react";

// Curved, looping text — the text follows an SVG wave path and scrolls endlessly
// along it (startOffset animated via requestAnimationFrame, mutating the DOM
// directly so there's no per-frame React re-render). No dependencies.
// Inspired by the reactbits "Curved Loop" text animation.
export default function CurvedLoop({
  text,
  speed = 0.5,
  fontSize = 64,
  curve = 90,
  className = "",
}: {
  text: string;
  speed?: number;   // px per frame along the path
  fontSize?: number; // in SVG units
  curve?: number;    // wave amplitude in SVG units
  className?: string;
}) {
  const rawId = useId();
  const pathId = "cl-" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  const tpRef = useRef<SVGTextPathElement>(null);

  const REPEAT = 12;
  const unit = text.trim() + "  ✦  "; // "  ✦  " separator
  const full = unit.repeat(REPEAT);

  useEffect(() => {
    const tp = tpRef.current;
    if (!tp) return;
    let raf = 0;
    let offset = 0;
    let spacing = 0;

    const measure = () => {
      const t = tp.getComputedTextLength();
      spacing = t > 0 ? t / REPEAT : 0; // width of a single repeated unit
    };

    const step = () => {
      if (!spacing) measure();
      if (spacing) {
        offset -= speed;
        if (offset <= -spacing) offset += spacing; // wrap for a seamless loop
        tp.setAttribute("startOffset", offset + "px");
      }
      raf = requestAnimationFrame(step);
    };

    measure();
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [full, speed]);

  const W = 1600;
  const H = 300;
  const midY = H / 2;
  // gentle symmetric wave spanning the full width (with overshoot on both ends)
  const d = `M -300 ${midY} Q ${W * 0.25} ${midY - curve} ${W * 0.5} ${midY} T ${W + 300} ${midY}`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <path id={pathId} d={d} fill="none" />
      </defs>
      <text fontSize={fontSize} className="curved-loop-text">
        <textPath ref={tpRef} href={`#${pathId}`} startOffset="0">
          {full}
        </textPath>
      </text>
    </svg>
  );
}
