"use client";

import { signOut } from "next-auth/react";
import { MODULES, type ModuleDef } from "@/lib/nav";
import type { ModuleId, SessionUser } from "@/lib/types";

export default function ModuleHome({
  user,
  onSelect,
}: {
  user: SessionUser;
  onSelect: (m: ModuleId) => void;
}) {
  const isAdmin = user.role === "admin";
  const modules: ModuleDef[] = MODULES.filter((m) => !m.adminOnly || isAdmin);
  const first = (user.name || user.email || "").split(/[\s@]+/)[0];

  return (
    <div className="module-home">
      <div className="module-home-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ConveGenius.AI" className="module-home-logo" />
        <button className="btn btn-ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
          <i className="ti ti-logout" /> Sign out
        </button>
      </div>

      <div className="module-home-hero">
        <h1>{first ? `Welcome, ${first}` : "Welcome"}</h1>
        <p>Choose a module to get started.</p>
      </div>

      <div className="module-grid">
        {modules.map((m) => {
          const count = m.groups.reduce((n, g) => n + g.items.length, 0);
          return (
            <button
              key={m.id}
              className="module-card"
              style={{ ["--accent" as string]: m.accent }}
              onClick={() => onSelect(m.id)}
            >
              <div className="module-card-icon">
                <i className={"ti " + m.icon} />
              </div>
              <div className="module-card-name">{m.name}</div>
              <div className="module-card-tag">{m.tagline}</div>
              <p className="module-card-blurb">{m.blurb}</p>
              <div className="module-card-foot">
                <span>{count} {count === 1 ? "tool" : "tools"}</span>
                <i className="ti ti-arrow-right" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
