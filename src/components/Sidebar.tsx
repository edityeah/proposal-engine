"use client";

import { signOut } from "next-auth/react";
import { getModule } from "@/lib/nav";
import SidebarRecents from "./SidebarRecents";
import ThemeToggle from "./ThemeToggle";
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
  collapsed,
  onToggleCollapse,
  onOpenProfile,
  onOpenAbout,
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenProfile?: () => void;
  onOpenAbout?: () => void;
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
    <nav className={"sidebar" + (open ? " open" : "")}>
      <div className="sidebar-toolbar">
        <button className="sidebar-back" onClick={home} title="All modules">
          <i className="ti ti-arrow-left" /> <span>All modules</span>
        </button>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <i className={"ti " + (collapsed ? "ti-layout-sidebar-left-expand" : "ti-layout-sidebar-left-collapse")} />
        </button>
      </div>
      <div className="sidebar-head">
        <span className="sidebar-head-icon">{mod.name.charAt(0)}</span>
        <div className="sidebar-head-body">
          <div className="sidebar-head-name">{mod.name}</div>
          <div className="sidebar-head-tag">{mod.tagline}</div>
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

      <ThemeToggle />

      <button
        className="btn btn-outline sidebar-changelog sidebar-about"
        onClick={onOpenAbout}
        title="Documentation & Versions"
      >
        <i className="ti ti-book" /> <span>Documentation &amp; Versions</span>
      </button>

      <div className="sidebar-user">
        <button className="sidebar-user-main" onClick={onOpenProfile} title="Profile & settings">
          <div className="user-avatar">
            {user.image ? <img src={user.image} alt="" /> : initials(user)}
          </div>
          <div className="sidebar-user-body">
            <div className="user-name">{user.name || user.email}</div>
            <div className="user-role">{isAdmin ? "Admin · Pre Sales" : "Pre Sales"}</div>
          </div>
        </button>
        <button
          className="sidebar-signout"
          title="Sign out"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <i className="ti ti-logout" />
        </button>
      </div>
    </nav>
  );
}
