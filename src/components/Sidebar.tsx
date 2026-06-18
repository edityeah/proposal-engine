"use client";

import { signOut } from "next-auth/react";
import type { Screen, SessionUser } from "@/lib/types";

const NAV: { groups: { label: string; items: { id: Screen | string; icon: string; name: string; soon?: boolean }[] }[] } = {
  groups: [
    {
      label: "Generate",
      items: [
        { id: "generate", icon: "ti-sparkles", name: "Generate doc" },
        { id: "history", icon: "ti-clock-history", name: "History" },
        { id: "analytics", icon: "ti-chart-pie", name: "Win/loss analytics" },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { id: "knowledge", icon: "ti-brain", name: "Knowledge base" },
        { id: "rfplibrary", icon: "ti-file-search", name: "RFP library" },
      ],
    },
    {
      label: "Admin",
      items: [
        { id: "products", icon: "ti-adjustments-horizontal", name: "Products & prompts" },
        { id: "costing", icon: "ti-calculator", name: "Costing templates" },
        { id: "team", icon: "ti-users-group", name: "Team access", soon: true },
      ],
    },
  ],
};

function initials(user: SessionUser): string {
  const n = user.name || user.email || "?";
  return n
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function Sidebar({
  screen,
  onNavigate,
  user,
}: {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  user: SessionUser;
}) {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 3C8 3 4 6 4 10c0 3 2 5.5 5 6.5V21h6v-4.5c3-1 5-3.5 5-6.5 0-4-4-7-8-7z" fill="rgba(255,255,255,0.9)" />
            <circle cx="9" cy="10" r="1.5" fill="rgba(26,122,114,0.8)" />
            <circle cx="15" cy="10" r="1.5" fill="rgba(26,122,114,0.8)" />
          </svg>
        </div>
        <div className="logo-text-wrap">
          <div className="logo-text-main">Conve<span>Genius</span></div>
          <div className="logo-text-sub">Pre Sales Engine</div>
        </div>
      </div>

      {NAV.groups.map((g) => (
        <div className="sidebar-section" key={g.label}>
          <div className="sidebar-section-label">{g.label}</div>
          {g.items.map((it) => {
            const active = screen === it.id;
            return (
              <button
                key={it.id}
                className={"nav-item" + (active ? " active" : "")}
                onClick={() => onNavigate((it.soon ? "soon" : (it.id as Screen)))}
                title={it.soon ? "Coming in a later phase" : it.name}
              >
                <i className={"ti " + it.icon} />
                <span>{it.name}</span>
                {it.soon && <span className="nav-badge">soon</span>}
              </button>
            );
          })}
        </div>
      ))}

      <div className="sidebar-user">
        <div className="user-avatar">
          {user.image ? <img src={user.image} alt="" /> : initials(user)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">{user.name || user.email}</div>
          <div className="user-role">Pre Sales</div>
        </div>
        <button
          className="nav-item"
          style={{ width: "auto", padding: 6 }}
          title="Sign out"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <i className="ti ti-logout" />
        </button>
      </div>
    </nav>
  );
}
