"use client";

import { signOut } from "next-auth/react";
import { MODULES, type ModuleDef, type QuickLaunch } from "@/lib/nav";
import type { ModuleId, SessionUser } from "@/lib/types";
import CurvedLoop from "./CurvedLoop";
import ThemeToggle from "./ThemeToggle";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Repeat items so a marquee row is long enough to fill + loop; `rotate` offsets
// the second row so the two rows aren't identical.
function marqueeRow(items: QuickLaunch[], rotate = 0): QuickLaunch[] {
  if (items.length === 0) return [];
  const base = rotate ? [...items.slice(rotate), ...items.slice(0, rotate)] : items;
  const out: QuickLaunch[] = [];
  while (out.length < 6) out.push(...base);
  return out;
}

export default function ModuleHome({
  user,
  onSelect,
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
  // Feature phrases for the curved backdrop behind the cards.
  const featureText = modules.flatMap((m) => m.quickLaunch.map((q) => q.label)).join("  ✦  ");

  return (
    <div className="module-home">
      {/* animated curved feature text behind the welcome cards */}
      <CurvedLoop text={featureText} className="mh-curved-bg" fontSize={62} curve={80} speed={0.5} />
      <header className="mh-topbar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ConveGenius.AI" className="mh-logo" />
        <div className="mh-topbar-right">
          <ThemeToggle className="theme-toggle-inline" />
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
            const rowA = marqueeRow(m.quickLaunch);
            const rowB = marqueeRow(m.quickLaunch, 1);
            return (
              <div
                key={m.id}
                className="mh-card"
                style={{ ["--accent" as string]: m.accent }}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                }}
              >
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
                  <div className="mh-ql-label">Features</div>
                  <div className="mh-marquee">
                    <div className="mh-mq-row">
                      <div className="mh-mq-track">
                        {[...rowA, ...rowA].map((ql, i) => (
                          <span key={"a" + i} className="mh-chip">{ql.label}</span>
                        ))}
                      </div>
                    </div>
                    <div className="mh-mq-row">
                      <div className="mh-mq-track rev">
                        {[...rowB, ...rowB].map((ql, i) => (
                          <span key={"b" + i} className="mh-chip">{ql.label}</span>
                        ))}
                      </div>
                    </div>
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
          Made with <span className="mh-heart">🩵</span> by the ConveGenius team
        </footer>
      </div>
    </div>
  );
}
