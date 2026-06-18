"use client";

import { useEffect, useState } from "react";

interface Item {
  refType: string;
  refId: string;
  name: string;
  base: string;
  override: string | null;
}

export default function ProductsAdmin() {
  const [products, setProducts] = useState<Item[]>([]);
  const [generators, setGenerators] = useState<Item[]>([]);
  const [sel, setSel] = useState<Item | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    fetch("/api/admin/prompts")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setGenerators(d.generators || []);
      });
  }
  useEffect(load, []);

  function pick(it: Item) {
    setSel(it);
    setDraft(it.override ?? it.base);
    setSaved(false);
  }

  async function save() {
    if (!sel) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/prompts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refType: sel.refType, refId: sel.refId, content: draft }),
    });
    setSaving(false);
    setSaved(true);
    load();
  }

  const Row = ({ it }: { it: Item }) => (
    <div
      className={"admin-nav-item" + (sel?.refType === it.refType && sel?.refId === it.refId ? " active" : "")}
      onClick={() => pick(it)}
    >
      <i className={"ti " + (it.refType === "product" ? "ti-box" : "ti-file-text")} />
      <span style={{ flex: 1 }}>{it.name}</span>
      {it.override && <span className="tag tag-teal" style={{ fontSize: 9 }}>edited</span>}
      <i className="ti ti-chevron-right chev" />
    </div>
  );

  return (
    <>
      <div className="topbar"><div className="topbar-left"><div className="topbar-title">Products &amp; prompts</div></div></div>
      <div className="page-content">
        <div className="admin-split">
          <div>
            <div className="section-label">Product system prompts</div>
            <div className="admin-nav-list" style={{ marginBottom: 16 }}>
              {products.map((p) => <Row key={p.refId} it={p} />)}
            </div>
            <div className="section-label">Generator prompts</div>
            <div className="admin-nav-list">
              {generators.map((g) => <Row key={g.refId} it={g} />)}
            </div>
          </div>
          <div className="card">
            {!sel ? (
              <div style={{ color: "var(--text-muted)" }}>Select a product or generator to edit its prompt.</div>
            ) : (
              <>
                <div className="card-header">
                  <div className="card-title"><i className="ti ti-edit" /> {sel.name}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {sel.override && <button className="btn btn-outline" onClick={() => setDraft(sel.base)}>Reset to default</button>}
                    <button className="btn btn-primary" disabled={saving} onClick={save}>
                      <i className={"ti " + (saved ? "ti-check" : "ti-device-floppy")} /> {saving ? "Saving…" : saved ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
                  style={{ width: "100%", minHeight: 420, fontFamily: "ui-monospace, monospace", fontSize: 12.5, lineHeight: 1.6, padding: 14, border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg-page)" }}
                />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                  Saved edits override the built-in prompt for all future generations. The catalogue (product names, modules) stays in code.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
