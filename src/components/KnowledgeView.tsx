"use client";

import { useEffect, useRef, useState } from "react";

interface Doc {
  id: string;
  kind: string;
  title: string;
  state: string | null;
  tags: string[] | null;
  blobUrl: string | null;
  filename: string | null;
  words: number;
  createdAt: string;
}

const KIND_LABEL: Record<string, string> = {
  winning_proposal: "Winning proposal",
  rfp: "RFP",
  sop: "SOP",
  exhibit: "Exhibit",
  toc: "Theory of change",
};

export default function KnowledgeView({ mode }: { mode: "knowledge" | "rfp" }) {
  const isRfp = mode === "rfp";
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [kind, setKind] = useState(isRfp ? "rfp" : "winning_proposal");
  const [title, setTitle] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [tags, setTags] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    fetch("/api/knowledge" + (isRfp ? "?kind=rfp" : ""))
      .then((r) => r.json())
      .then((d) => setDocs(d.docs || []))
      .finally(() => setLoading(false));
  }
  useEffect(load, [isRfp]);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Choose a file first."); return; }
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    fd.append("title", title);
    fd.append("state", stateVal);
    fd.append("tags", tags);
    try {
      const res = await fetch("/api/knowledge", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) setError(d.error || "Upload failed");
      else {
        setTitle(""); setStateVal(""); setTags("");
        if (fileRef.current) fileRef.current.value = "";
        load();
      }
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    setDocs((d) => d.filter((x) => x.id !== id));
  }

  return (
    <>
      <div className="topbar"><div className="topbar-left"><div className="topbar-title">{isRfp ? "RFP library" : "Knowledge base"}</div></div></div>
      <div className="page-content">
        <div className="card">
          <div className="card-header"><div className="card-title"><i className="ti ti-upload" /> Upload {isRfp ? "an RFP" : "a document"}</div></div>
          <div className="grid-2">
            {!isRfp && (
              <div className="field">
                <label>Type</label>
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="winning_proposal">Winning proposal</option>
                  <option value="rfp">RFP</option>
                  <option value="sop">SOP</option>
                  <option value="exhibit">Exhibit</option>
                  <option value="toc">Theory of change</option>
                </select>
              </div>
            )}
            <div className="field"><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HP Vidya Utkarsh winning bid" /></div>
            <div className="field"><label>State</label><input value={stateVal} onChange={(e) => setStateVal(e.target.value)} placeholder="e.g. Himachal Pradesh" /></div>
            <div className="field"><label>Tags (comma-separated)</label><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="NIPUN, assessment, VSK" /></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ maxWidth: "100%" }} />
            <button className="btn btn-primary" disabled={uploading} onClick={upload}>
              <i className="ti ti-cloud-upload" /> {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
          {error && <div className="error-bar"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
            <i className="ti ti-bulb" /> Extracted text is used to ground future generations (winning proposals, RFPs, and SOPs are retrieved automatically by state and keywords).
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Document</th><th>Type</th><th>State</th><th>Words</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24 }}><span className="spinner-ring" /></td></tr>}
              {!loading && docs.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>Nothing uploaded yet.</td></tr>}
              {docs.map((d) => (
                <tr key={d.id}>
                  <td><div className="doc-name"><i className="ti ti-file-text" />{d.blobUrl ? <a href={d.blobUrl} target="_blank" rel="noreferrer">{d.title}</a> : d.title}</div></td>
                  <td>{KIND_LABEL[d.kind] || d.kind}</td>
                  <td>{d.state || "—"}</td>
                  <td>{d.words.toLocaleString("en-IN")}</td>
                  <td><button className="btn btn-ghost" onClick={() => remove(d.id)} title="Archive"><i className="ti ti-trash" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </>
  );
}
