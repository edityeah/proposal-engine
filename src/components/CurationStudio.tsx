"use client";

import { useEffect, useMemo, useState } from "react";
import { GENERATORS } from "@/data/generators";
import { PRODUCTS } from "@/data/products";

interface Entry {
  id: string;
  kind: string;
  title: string;
  content: string;
  tags: string[] | null;
  docTypes: string[] | null;
  products: string[] | null;
  state: string | null;
  enabled: number;
}

const KINDS = [
  { key: "best_practice", label: "Best practice / norm", icon: "ti-checklist", hint: "How-to and rules the model should follow." },
  { key: "proof_point", label: "Proof point / fact", icon: "ti-award", hint: "Deployments, awards, reference numbers to reuse." },
  { key: "boilerplate", label: "Boilerplate", icon: "ti-template", hint: "Approved standard sections to adapt." },
];
const KIND_LABEL: Record<string, string> = Object.fromEntries(KINDS.map((k) => [k.key, k.label]));

const PRODUCT_OPTS = PRODUCTS.filter((p) => p.systemPrompt).map((p) => ({ id: p.id, name: p.name }));

const BLANK = {
  id: "", kind: "best_practice", title: "", content: "", state: "",
  tags: [] as string[], docTypes: [] as string[], products: [] as string[], enabled: 1,
};

export default function CurationStudio() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState<typeof BLANK>(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function load() {
    fetch("/api/curation").then((r) => r.json()).then((d) => setEntries(d.entries || []));
  }
  useEffect(load, []);

  function startNew() { setDraft(BLANK); setEditingId(null); setErr(""); }
  function edit(e: Entry) {
    setEditingId(e.id);
    setErr("");
    setDraft({ id: e.id, kind: e.kind, title: e.title, content: e.content, state: e.state || "", tags: e.tags || [], docTypes: e.docTypes || [], products: e.products || [], enabled: e.enabled });
  }

  function toggleArr(key: "docTypes" | "products", val: string) {
    setDraft((d) => {
      const arr = new Set(d[key]);
      if (arr.has(val)) arr.delete(val); else arr.add(val);
      return { ...d, [key]: [...arr] };
    });
  }

  async function save() {
    if (!draft.title.trim() || !draft.content.trim()) { setErr("Title and content are required."); return; }
    setSaving(true); setErr("");
    const body = { ...draft, tags: draft.tags, state: draft.state || null };
    const res = editingId
      ? await fetch(`/api/curation/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/curation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error || "Save failed"); return; }
    startNew(); load();
  }

  async function archive(id: string) {
    await fetch(`/api/curation/${id}`, { method: "DELETE" });
    setEntries((e) => e.filter((x) => x.id !== id));
    if (editingId === id) startNew();
  }

  async function toggleEnabled(e: Entry) {
    await fetch(`/api/curation/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: e.enabled ? 0 : 1 }) });
    load();
  }

  const grouped = useMemo(() => KINDS.map((k) => ({ ...k, items: entries.filter((e) => e.kind === k.key) })), [entries]);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><div className="topbar-title">Curation studio</div></div>
        <div className="topbar-right"><button className="btn btn-primary" onClick={startNew}><i className="ti ti-plus" /> New entry</button></div>
      </div>
      <div className="page-content">
        <div className="banner info" style={{ marginBottom: 16 }}>
          <i className="ti ti-info-circle" />
          <div>Entries here are injected into matching drafts as <strong>authoritative guidance</strong>. Scope an entry to specific document types, products, or a state — or leave those blank to apply everywhere.</div>
        </div>
        <div className="admin-split">
          <div>
            {grouped.map((g) => (
              <div key={g.key} style={{ marginBottom: 16 }}>
                <div className="section-label"><i className={"ti " + g.icon} /> {g.label} ({g.items.length})</div>
                <div className="admin-nav-list">
                  {g.items.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "6px 2px" }}>None yet.</div>}
                  {g.items.map((e) => (
                    <div key={e.id} className={"admin-nav-item" + (editingId === e.id ? " active" : "")} style={{ opacity: e.enabled ? 1 : 0.5 }}>
                      <span style={{ flex: 1, cursor: "pointer" }} onClick={() => edit(e)}>{e.title}</span>
                      <button className="btn btn-ghost" style={{ padding: 4 }} title={e.enabled ? "Disable" : "Enable"} onClick={() => toggleEnabled(e)}><i className={"ti " + (e.enabled ? "ti-toggle-right" : "ti-toggle-left")} /></button>
                      <button className="btn btn-ghost" style={{ padding: 4 }} title="Archive" onClick={() => archive(e.id)}><i className="ti ti-trash" /></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title"><i className="ti ti-edit" /> {editingId ? "Edit entry" : "New entry"}</div></div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Type</label>
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
                {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
              <span className="hint">{KINDS.find((k) => k.key === draft.kind)?.hint}</span>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Title</label>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. How to frame PAB notes" />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Content / guidance</label>
              <textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder="The norm, fact, or boilerplate text the model should apply…" style={{ minHeight: 120 }} />
            </div>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div className="field">
                <label>State <span style={{ fontWeight: 400, color: "var(--text-hint)" }}>(blank = all)</span></label>
                <input value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} placeholder="e.g. Himachal Pradesh" />
              </div>
              <div className="field">
                <label>Tags (comma-separated)</label>
                <input value={draft.tags.join(", ")} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} placeholder="NIPUN, GeM" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div className="section-label">Applies to document types <span style={{ textTransform: "none", fontWeight: 400 }}>(none = all)</span></div>
              <div className="check-grid">
                {GENERATORS.map((g) => (
                  <label key={g.id} className="module-check-item">
                    <input type="checkbox" checked={draft.docTypes.includes(g.id)} onChange={() => toggleArr("docTypes", g.id)} />
                    <span className="mod-name">{g.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div className="section-label">Applies to products <span style={{ textTransform: "none", fontWeight: 400 }}>(none = all)</span></div>
              <div className="check-grid">
                {PRODUCT_OPTS.map((p) => (
                  <label key={p.id} className="module-check-item">
                    <input type="checkbox" checked={draft.products.includes(p.id)} onChange={() => toggleArr("products", p.id)} />
                    <span className="mod-name">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
            {err && <div className="error-bar"><i className="ti ti-alert-circle" /><span>{err}</span></div>}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" disabled={saving} onClick={save}><i className="ti ti-device-floppy" /> {saving ? "Saving…" : editingId ? "Update entry" : "Add entry"}</button>
              {editingId && <button className="btn btn-outline" onClick={startNew}>Cancel</button>}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
              Currently editing as <strong>{KIND_LABEL[draft.kind]}</strong>. Disabled entries are kept but not injected.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
