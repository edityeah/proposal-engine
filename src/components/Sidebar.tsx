"use client";

import { signOut } from "next-auth/react";
import type { Screen, SessionUser } from "@/lib/types";

interface NavItem { id: Screen | string; icon: string; name: string; soon?: boolean }
interface NavGroup { label: string; items: NavItem[]; adminOnly?: boolean }

const NAV: { groups: NavGroup[] } = {
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
        { id: "chat", icon: "ti-message-chatbot", name: "Research chat" },
        { id: "knowledge", icon: "ti-brain", name: "Knowledge base" },
        { id: "rfplibrary", icon: "ti-file-search", name: "RFP library" },
      ],
    },
    {
      label: "Admin",
      adminOnly: true,
      items: [
        { id: "curation", icon: "ti-books", name: "Curation studio" },
        { id: "products", icon: "ti-adjustments-horizontal", name: "Products & prompts" },
        { id: "costing", icon: "ti-calculator", name: "Costing templates" },
        { id: "team", icon: "ti-users-group", name: "Team access" },
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
  const isAdmin = user.role === "admin";
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ConveGenius.AI" className="sidebar-logo-img" />
        <div className="logo-text-sub sidebar-logo-tag">Pre Sales Engine</div>
      </div>

      {NAV.groups
        .filter((g) => !g.adminOnly || isAdmin)
        .map((g) => (
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
          <div className="user-role">{isAdmin ? "Admin · Pre Sales" : "Pre Sales"}</div>
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
