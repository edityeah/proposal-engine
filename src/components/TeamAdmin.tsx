"use client";

import { useEffect, useState } from "react";
import { STATES } from "@/config/orgs";

interface U {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  state: string | null;
  locked: boolean;
}

export default function TeamAdmin() {
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users || [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function patch(id: string, patch: { role?: string; state?: string | null }) {
    setSavingId(id);
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...patch } : u)));
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    }).catch(() => {});
    setSavingId(null);
  }

  return (
    <>
      <div className="topbar"><div className="topbar-left"><div className="topbar-title">Team access</div></div></div>
      <div className="page-content">
        <div className="banner info" style={{ marginBottom: 16 }}>
          <i className="ti ti-info-circle" />
          <div>
            <strong>Admins</strong> manage the intelligence backbone, prompts, curation and costing, and see all states.
            <strong> Operators</strong> generate &amp; browse, scoped to their assigned state (History &amp; analytics).
            Seeded admins (devasheesh, aditya.c) are locked.
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>User</th><th>Role</th><th>State</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={3} style={{ textAlign: "center", padding: 24 }}><span className="spinner-ring" /></td></tr>}
                {!loading && users.length === 0 && <tr><td colSpan={3} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No users have signed in yet.</td></tr>}
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="doc-name">{u.name || u.email}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.email}{u.locked && " · seeded admin"}{savingId === u.id && " · saving…"}</div>
                    </td>
                    <td>
                      <select value={u.role} disabled={u.locked} onChange={(e) => patch(u.id, { role: e.target.value })}
                        style={{ fontSize: 12, padding: "6px 8px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", background: u.locked ? "var(--bg-page)" : "white" }}>
                        <option value="operator">Operator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <select value={u.state ?? ""} onChange={(e) => patch(u.id, { state: e.target.value || null })}
                        style={{ fontSize: 12, padding: "6px 8px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", background: "white" }}>
                        <option value="">All states</option>
                        {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
          Operators with “All states” see everything until you scope them to a state. The Knowledge base &amp; RFP library stay shared across all states (cross-team discovery).
        </div>
      </div>
    </>
  );
}
