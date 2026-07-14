"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A playful Polaroid photobooth for the login left panel. First tap of the red
// shutter asks for a name, then opens the webcam (explicit gesture — no auto
// prompt). Tapping the shutter runs a 3-2-1 countdown inside the button; at zero
// the camera flashes and captures a high-resolution polaroid — ConveGenius logo on
// top, the photo in the middle, the name at the bottom — which downloads
// automatically and opens in a preview overlay. Fully client-side — no backend, no keys.
export default function LoginPhotobooth() {
  const [streaming, setStreaming] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [snap, setSnap] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false); // the enlarged polaroid overlay
  const [booth, setBooth] = useState(false);             // full-screen live-capture overlay (countdown over the feed)
  const [shots, setShots] = useState(0);                 // increments per capture (re-runs the eject)
  const videoRef = useRef<HTMLVideoElement>(null);
  const boothVideoRef = useRef<HTMLVideoElement>(null);  // the large live feed inside the booth overlay
  const streamRef = useRef<MediaStream | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const img = new Image();               // preload the logo for the polaroid
    img.onload = () => { logoRef.current = img; };
    img.src = "/logo.png";
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  async function start(): Promise<boolean> {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 2560 }, height: { ideal: 1440 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setStreaming(true);
      return true;
    } catch {
      setError("Camera blocked — allow access to use the booth.");
      return false;
    }
  }

  function submitName() { setNaming(false); void openBooth(); }

  // Open the full-screen booth: the live feed fills an overlay and the 3-2-1 counts
  // down over it (not inside the shutter button). At zero we capture + print.
  async function openBooth() {
    setBooth(true);
    const ok = await start();
    if (ok) setCountdown(3);
    else setBooth(false);
  }

  // Mirror the live stream into the big booth video once the overlay has mounted.
  useEffect(() => {
    if (booth && streaming && boothVideoRef.current && streamRef.current) {
      boothVideoRef.current.srcObject = streamRef.current;
      boothVideoRef.current.play().catch(() => {});
    }
  }, [booth, streaming]);

  // Download the composited polaroid (high-res PNG) to the user's Downloads.
  function saveImage(url: string, label?: string) {
    const safe = (label || "guest").trim().replace(/\s+/g, "-").toLowerCase() || "guest";
    const a = document.createElement("a");
    a.href = url; a.download = `polaroid-${safe}.png`; a.click();
  }

  function capture() {
    const video = boothVideoRef.current || videoRef.current;
    if (!video || !video.videoWidth) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    const size = Math.min(vw, vh);
    const sx = (vw - size) / 2, sy = (vh - size) / 2;
    // Polaroid at the webcam's native resolution — no downscaling (high quality).
    const P = size, side = Math.round(P * 0.055), top = Math.round(P * 0.17), bottom = Math.round(P * 0.18);
    const cw = P + side * 2, ch = top + P + bottom;
    const c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch);

    // ConveGenius logo — top of the polaroid (falls back to text if not loaded).
    const logo = logoRef.current;
    if (logo && logo.width) {
      let lh = Math.round(P * 0.088);                 // logo size
      let lw = logo.width * (lh / logo.height);
      const maxLw = cw * 0.82, maxLh = top * 0.82;    // keep it within the top band
      if (lw > maxLw) { lw = maxLw; lh = logo.height * (lw / logo.width); }
      if (lh > maxLh) { lh = maxLh; lw = logo.width * (lh / logo.height); }
      ctx.drawImage(logo, (cw - lw) / 2, (top - lh) / 2, lw, lh);
    } else {
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#4b5563";
      ctx.font = `700 ${Math.round(P * 0.05)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
      ctx.fillText("ConveGenius.AI", cw / 2, top / 2);
    }

    // The photo (mirrored, like a selfie), drawn 1:1 in the middle.
    ctx.save();
    ctx.translate(side + P, top); ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, size, size, 0, 0, P, P);
    ctx.restore();

    // Name — below the photo, capped with a victory emoji.
    const cleanName = name.trim() || "Guest";
    const label = `${cleanName} 🎉`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#1f2937";
    ctx.font = `700 ${Math.round(P * 0.075)}px 'Plus Jakarta Sans', system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`;
    ctx.fillText(label, cw / 2, top + P + bottom / 2);

    const url = c.toDataURL("image/png");
    setSnap(url);
    setShots((s) => s + 1);       // triggers the eject animation on the new print
    setFlash(true); setTimeout(() => setFlash(false), 450);
    saveImage(url, cleanName);    // auto-download the high-res polaroid (filename without emoji)

    // Turn the camera off right after the shot — only the polaroid stays on screen.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  }

  // Run the 3-2-1 countdown inside the shutter, then fire the capture at zero.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { capture(); setCountdown(null); setTimeout(() => setBooth(false), 550); return; }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 850);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  function onShutter() {
    if (naming || booth) return;
    if (name.trim()) { void openBooth(); return; }  // name known → open the booth overlay
    setNaming(true); setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  return (
    <div className="pb-wrap">
      {/* Polaroid Supercolor 1000 — the Figma design, as a single transparent image
          with the live webcam + a clickable shutter overlaid on top. */}
      <div className={"pb-camera" + (snap ? " has-print" : "")}>
        {/* the printed polaroid, ejecting from the bottom slot; tap it to enlarge */}
        {snap && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={shots} className="pb-print" src={snap} alt="Your polaroid — tap to view" onClick={() => setOverlayOpen(true)} />
        )}
        <picture>
          <source srcSet="/vintage-camera.webp" type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pb-cam-img" src="/vintage-camera.png" alt="Polaroid Supercolor 1000 camera" width={1000} height={822} draggable={false} />
        </picture>
        {/* live webcam seated in the lens */}
        <div className={"pb-lens" + (streaming ? " on" : "")}>
          <video ref={videoRef} autoPlay playsInline muted className={streaming ? "on" : ""} />
        </div>
        {/* transparent shutter over the printed red button */}
        <button className="pb-shutter" onClick={onShutter} aria-label="Start photobooth" />
        {/* flash fires on the top-right flash unit when the shutter captures */}
        {flash && <span className="pb-flash-full" />}
        {flash && <span className="pb-flash-bulb" />}
      </div>

      {naming ? (
        <form className="pb-name" onSubmit={(e) => { e.preventDefault(); submitName(); }}>
          <input
            ref={nameInputRef}
            className="pb-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={28}
          />
          <button type="submit" className="pb-name-go" aria-label="Start camera"><i className="ti ti-arrow-right" /></button>
        </form>
      ) : (
        <div className="pb-caption">
          {error
            ? error
            : booth
              ? "Look at the camera — smile!"
              : snap
                ? "Printed & saved · tap the polaroid to view, or the red button for another."
                : "📸 Photobooth — tap the red button to start."}
        </div>
      )}

      {mounted && booth && createPortal(
        <div className="pb-booth">
          <div className="pb-booth-stage">
            <video ref={boothVideoRef} autoPlay playsInline muted className="pb-booth-video" />
            {flash && <span className="pb-booth-flash" />}
            {countdown !== null && (
              <div key={countdown} className="pb-booth-count">
                {countdown >= 2
                  ? <span className="pb-booth-num">{countdown}</span>
                  : <span className="pb-booth-cheese">Smile — say cheese! 📸</span>}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}

      {mounted && overlayOpen && snap && createPortal(
        <div className="pb-overlay" onClick={() => setOverlayOpen(false)}>
          <div className="pb-overlay-card" onClick={(e) => e.stopPropagation()}>
            <button className="pb-overlay-close" onClick={() => setOverlayOpen(false)} aria-label="Close"><i className="ti ti-x" /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pb-overlay-img" src={snap} alt="Your polaroid" />
            <button className="pb-overlay-dl" onClick={() => saveImage(snap, name)}><i className="ti ti-download" /> Download</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
