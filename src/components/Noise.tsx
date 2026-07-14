"use client";

import { useEffect, useRef } from "react";

// Animated film-grain / noise texture overlay — a single <canvas> that redraws
// random grayscale grain a few times a second. Pure canvas, no dependencies.
// Adapted from the reactbits "Noise" effect for this project's plain-CSS stack.
// Sits absolutely inside a positioned parent; keep it low in the stacking order.
export default function Noise({
  alpha = 20,
  refreshInterval = 2,
  cap = 800,
}: {
  alpha?: number;          // 0–255 grain opacity per pixel
  refreshInterval?: number; // redraw every N animation frames (higher = calmer/lighter)
  cap?: number;            // max canvas dimension (perf guard; it's stretched to fill)
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let frame = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const p = canvas.parentElement;
      w = Math.max(1, Math.min(cap, Math.ceil(p?.clientWidth ?? 300)));
      h = Math.max(1, Math.min(cap, Math.ceil(p?.clientHeight ?? 300)));
      canvas.width = w;
      canvas.height = h;
    };

    const draw = () => {
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = alpha;
      }
      ctx.putImageData(img, 0, 0);
    };

    const loop = () => {
      if (frame % refreshInterval === 0) draw();
      frame++;
      raf = requestAnimationFrame(loop);
    };

    resize();
    draw();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [alpha, refreshInterval, cap]);

  return <canvas ref={ref} className="noise-canvas" aria-hidden="true" />;
}
