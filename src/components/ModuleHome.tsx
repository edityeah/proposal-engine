"use client";

import { signOut } from "next-auth/react";
import { MODULES, type ModuleDef, type QuickLaunch } from "@/lib/nav";
import type { ModuleId, SessionUser } from "@/lib/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function ModuleHome({
  user,
  onSelect,
  onLaunch,
}: {
  user: SessionUser;
  onSelect: (m: ModuleId) => void;
  onLaunch: (m: ModuleId, ql: QuickLaunch) => void;
}) {
  const isAdmin = user.role === "admin";
  const modules: ModuleDef[] = MODULES.filter((m) => !m.adminOnly || isAdmin);
  const first = (user.name || user.email || "").split(/[\s@]+/)[0] || "";
  const initial = (first || user.email || "?").charAt(0).toUpperCase();

  const engineCount = modules.length;
  const toolCount = modules.reduce((n, m) => n + m.quickLaunch.length, 0);

  return (
    <div className="module-home">
      <header className="mh-topbar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ConveGenius.AI" className="mh-logo" />
        <div className="mh-topbar-right">
          <div className="mh-userpill" title={user.email ?? undefined}>
            <span className="mh-userpill-name">{first || "Account"}</span>
            <span className="mh-userpill-avatar">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" />
              ) : (
                initial
              )}
            </span>
          </div>
          <button className="mh-signout" onClick={() => signOut({ callbackUrl: "/login" })}>
            <i className="ti ti-logout" /> Sign out
          </button>
        </div>
      </header>

      <div className="mh-inner">
        <section className="mh-hero">
          <div className="mh-hero-text">
            <div className="mh-eyebrow">{greeting()}</div>
            <h1>{first ? `Welcome, ${first}` : "Welcome"}</h1>
            <p>Choose a module to get started — or jump straight to a tool.</p>
          </div>
          <div className="mh-stats" aria-hidden="true">
            <div className="mh-stat">
              <div className="mh-stat-num">{engineCount}</div>
              <div className="mh-stat-label">{engineCount === 1 ? "engine" : "engines"}</div>
            </div>
            <div className="mh-stat">
              <div className="mh-stat-num">{toolCount}</div>
              <div className="mh-stat-label">{toolCount === 1 ? "tool" : "tools"}</div>
            </div>
          </div>
        </section>

        <div className="mh-grid">
          {modules.map((m) => {
            const count = m.quickLaunch.length;
            return (
              <div key={m.id} className="mh-card" style={{ ["--accent" as string]: m.accent }}>
                <div className="mh-card-head">
                  <div className="mh-card-icon">
                    <i className={"ti " + m.icon} />
                  </div>
                  <div className="mh-card-headtext">
                    <div className="mh-card-titlerow">
                      <span className="mh-card-name">{m.name}</span>
                      <span className="mh-card-badge">
                        {count} {count === 1 ? "tool" : "tools"}
                      </span>
                    </div>
                    <div className="mh-card-tag">{m.tagline}</div>
                  </div>
                </div>

                <p className="mh-card-blurb">{m.blurb}</p>

                <div className="mh-card-ql">
                  <div className="mh-ql-label">Quick launch</div>
                  <div className="mh-ql-chips">
                    {m.quickLaunch.map((ql) => (
                      <button
                        key={ql.label}
                        className="mh-chip"
                        onClick={() => onLaunch(m.id, ql)}
                      >
                        <span className="mh-chip-dot" />
                        {ql.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button className="mh-card-open" onClick={() => onSelect(m.id)}>
                  Open {m.name} <i className="ti ti-arrow-right" />
                </button>
              </div>
            );
          })}
        </div>

        <footer className="mh-footer">
          Made with <span className="mh-heart">💜</span> by the ConveGenius team
        </footer>
      </div>
    </div>
  );
}
