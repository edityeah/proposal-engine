"use client";

import { signOut } from "next-auth/react";
import { getModule } from "@/lib/nav";
import SidebarRecents from "./SidebarRecents";
import type { ModuleId, Screen, SessionUser } from "@/lib/types";

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
  moduleId,
  screen,
  onNavigate,
  onHome,
  onOpenProposal,
  onOpenChat,
  recentsKey,
  user,
  open,
  onClose,
}: {
  moduleId: ModuleId;
  screen: Screen;
  onNavigate: (s: Screen) => void;
  onHome: () => void;
  onOpenProposal: (id: string) => void;
  onOpenChat: (threadId: string) => void;
  recentsKey: number;
  user: SessionUser;
  open?: boolean;
  onClose?: () => void;
}) {
  const isAdmin = user.role === "admin";
  const mod = getModule(moduleId);
  const go = (s: Screen) => {
    onNavigate(s);
    onClose?.();
  };
  const home = () => {
    onHome();
    onClose?.();
  };

  return (
    <nav className={"sidebar" + (open ? " open" : "")} style={{ ["--accent" as string]: mod.accent }}>
      <button className="sidebar-back" onClick={home} title="All modules">
        <i className="ti ti-arrow-left" />
        <span>All modules</span>
      </button>

      <div className="sidebar-module">
        <span className="sidebar-module-dot" />
        <div>
          <div className="sidebar-module-name">{mod.name}</div>
          <div className="sidebar-module-tag">{mod.tagline}</div>
        </div>
      </div>

      <div className="sidebar-scroll">
        {mod.groups.map((g) => (
          <div className="sidebar-section" key={g.label}>
            <div className="sidebar-section-label">{g.label}</div>
            {g.items.map((it) => {
              const active = screen === it.id;
              return (
                <button
                  key={it.id}
                  className={"nav-item" + (active ? " active" : "")}
                  onClick={() => go(it.id)}
                  title={it.name}
                >
                  <i className={"ti " + it.icon} />
                  <span>{it.name}</span>
                </button>
              );
            })}
          </div>
        ))}

        <SidebarRecents
          moduleId={moduleId}
          refreshKey={recentsKey}
          onOpenProposal={(id) => { onOpenProposal(id); onClose?.(); }}
          onOpenChat={(id) => { onOpenChat(id); onClose?.(); }}
          onClose={onClose}
        />
      </div>

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
