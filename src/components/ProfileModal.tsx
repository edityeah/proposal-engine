"use client";

import { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/types";

type Accent = { id: string; label: string; color: string };
const ACCENTS: Accent[] = [
  { id: "", label: "Neutral", color: "#171717" },
  { id: "cg", label: "ConveGenius", color: "linear-gradient(135deg, #4a4a9c 0%, #4a4a9c 50%, #5ec5b6 50%, #5ec5b6 100%)" },
  { id: "blue", label: "Blue", color: "#2563eb" },
  { id: "violet", label: "Violet", color: "#7c3aed" },
  { id: "green", label: "Green", color: "#059669" },
  { id: "amber", label: "Orange", color: "#d97706" },
];

function applyAccent(id: string) {
  const root = document.documentElement;
  if (id) root.setAttribute("data-accent", id);
  else root.removeAttribute("data-accent");
  try { localStorage.setItem("accent", id); } catch {}
}
function applyTheme(t: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("theme", t); } catch {}
}
function initials(u: SessionUser): string {
  const n = u.name || u.email || "?";
  return n.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function ProfileModal({ user, onClose }: { user: SessionUser; onClose: () => void }) {
  const [tab, setTab] = useState<"profile" | "appearance">("profile");
  const [accent, setAccent] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try { setAccent(localStorage.getItem("accent") ?? "amber"); } catch {}
    setTheme((document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="profile-modal" onMouseDown={(e) => e.stopPropagation()}>
        <aside className="pm-menu">
          <div className="pm-menu-head">Settings</div>
          <button className={"pm-menu-item" + (tab === "profile" ? " active" : "")} onClick={() => setTab("profile")}>
            <i className="ti ti-user" /> Profile
          </button>
          <button className={"pm-menu-item" + (tab === "appearance" ? " active" : "")} onClick={() => setTab("appearance")}>
            <i className="ti ti-palette" /> Appearance
          </button>
        </aside>

        <div className="pm-body">
          <button className="pm-close" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>

          {tab === "profile" ? (
            <div className="pm-section">
              <div className="pm-title">Profile</div>
              <div className="pm-profile">
                <div className="pm-avatar">
                  {user.image ? <img src={user.image} alt="" /> : initials(user)}
                </div>
                <div>
                  <div className="pm-name">{user.name || "—"}</div>
                  <div className="pm-email">{user.email}</div>
                </div>
              </div>
              <div className="pm-fields">
                <div className="pm-field"><label>Name</label><div className="pm-val">{user.name || "—"}</div></div>
                <div className="pm-field"><label>Email</label><div className="pm-val">{user.email || "—"}</div></div>
                <div className="pm-field"><label>Role</label><div className="pm-val">{user.role === "admin" ? "Admin · Pre Sales" : "Pre Sales"}</div></div>
                <div className="pm-field"><label>State</label><div className="pm-val">{user.state || "—"}</div></div>
              </div>
            </div>
          ) : (
            <div className="pm-section">
              <div className="pm-title">Appearance</div>

              <div className="pm-sub">Theme</div>
              <div className="theme-toggle pm-theme">
                <button className={"theme-opt" + (theme === "light" ? " active" : "")} onClick={() => { applyTheme("light"); setTheme("light"); }}>
                  <i className="ti ti-sun" /> <span>Light</span>
                </button>
                <button className={"theme-opt" + (theme === "dark" ? " active" : "")} onClick={() => { applyTheme("dark"); setTheme("dark"); }}>
                  <i className="ti ti-moon" /> <span>Dark</span>
                </button>
              </div>

              <div className="pm-sub">Accent colour</div>
              <div className="pm-accent-help">Recolours buttons, badges and highlights across the dashboard.</div>
              <div className="pm-accents">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id || "neutral"}
                    className={"pm-accent" + (accent === a.id ? " active" : "")}
                    onClick={() => { applyAccent(a.id); setAccent(a.id); }}
                    title={a.label}
                  >
                    <span className="pm-accent-dot" style={{ background: a.color }}>
                      {accent === a.id && <i className="ti ti-check" />}
                    </span>
                    <span className="pm-accent-label">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
