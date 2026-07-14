"use client";

import { useEffect, useMemo, useState } from "react";
import KnowledgeLearnView from "./KnowledgeLearnView";
import RfpViewer from "./RfpViewer";
import { STATES } from "@/config/orgs";

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
  text?: string;
}

const KIND_LABEL: Record<string, string> = {
  winning_proposal: "Winning proposal",
  losing_proposal: "Losing proposal",
  rfp: "RFP",
  sop: "SOP",
  exhibit: "Exhibit",
  toc: "Theory of change",
  inception: "Inception report",
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "winning_proposal", label: "Winning" },
  { value: "inception", label: "Inception" },
  { value: "rfp", label: "RFP" },
  { value: "sop", label: "SOP" },
  { value: "exhibit", label: "Exhibit" },
  { value: "toc", label: "ToC" },
];

const REFERENCE_KINDS = ["rfp", "sop", "exhibit", "toc"];

export default function KnowledgeView({ mode }: { mode: "knowledge" | "rfp" }) {
  const isRfp = mode === "rfp";
  const [docs, setDocs] = useState<Doc[]>([]);
  const [learn, setLearn] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterKind, setFilterKind] = useState("all");
  const [viewer, setViewer] = useState<Doc | null>(null); // RFP document open in the viewer
  // Inception-report ingest (distill → section chunks + curation)
  const [ingest, setIngest] = useState(false);
  const [ingestFile, setIngestFile] = useState<File | null>(null);
  const [ingestState, setIngestState] = useState("");
  const [ingestProduct, setIngestProduct] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);
  const [ingestErr, setIngestErr] = useState<string | null>(null);
  // RFP library upload
  const [rfpUp, setRfpUp] = useState(false);
  const [rfpFile, setRfpFile] = useState<File | null>(null);
  const [rfpTitle, setRfpTitle] = useState("");
  const [rfpStateVal, setRfpStateVal] = useState("");
  const [rfpTags, setRfpTags] = useState("");
  const [rfpUploading, setRfpUploading] = useState(false);
  const [rfpErr, setRfpErr] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/knowledge" + (isRfp ? "?kind=rfp" : ""))
      .then((r) => r.json())
      .then((d) => setDocs(d.docs || []))
      .finally(() => setLoading(false));
  }
  useEffect(load, [isRfp]);

  // Surface the grounding explainer once — the first time this tab is opened.
  useEffect(() => {
    try {
      if (!localStorage.getItem("cg-kb-info-seen")) {
        setShowInfo(true);
        localStorage.setItem("cg-kb-info-seen", "1");
      }
    } catch {}
  }, []);

  const stats = useMemo(
    () => ({
      total: docs.length,
      won: docs.filter((d) => d.kind === "winning_proposal").length,
      lost: docs.filter((d) => d.kind === "losing_proposal").length,
      reference: docs.filter((d) => REFERENCE_KINDS.includes(d.kind)).length,
    }),
    [docs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (filterKind !== "all" && d.kind !== filterKind) return false;
      if (q) {
        const hay = (d.title + " " + (d.state || "") + " " + (d.tags || []).join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [docs, query, filterKind]);

  async function remove(id: string) {
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    setDocs((d) => d.filter((x) => x.id !== id));
  }

  async function runIngest() {
    if (!ingestFile) { setIngestErr("Choose a file first."); return; }
    setIngesting(true); setIngestErr(null); setIngestMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", ingestFile);
      if (ingestState.trim()) fd.append("state", ingestState.trim());
      if (ingestProduct.trim()) fd.append("product", ingestProduct.trim());
      const res = await fetch("/api/knowledge/inception", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Ingest failed.");
      setIngestMsg(`Distilled “${d.title}” → ${d.sections} section chunk${d.sections === 1 ? "" : "s"} + ${d.curation} curation entr${d.curation === 1 ? "y" : "ies"}.`);
      setIngestFile(null);
      load();
    } catch (e) {
      setIngestErr(e instanceof Error ? e.message : "Ingest failed.");
    } finally {
      setIngesting(false);
    }
  }

  // Upload an RFP straight into the library (kind "rfp"), same as an attached RFP.
  async function uploadRfp() {
    if (!rfpFile) { setRfpErr("Choose a file first."); return; }
    setRfpUploading(true); setRfpErr(null);
    try {
      const fd = new FormData();
      fd.append("file", rfpFile);
      fd.append("kind", "rfp");
      if (rfpTitle.trim()) fd.append("title", rfpTitle.trim());
      if (rfpStateVal) fd.append("state", rfpStateVal);
      if (rfpTags.trim()) fd.append("tags", rfpTags.trim());
      const res = await fetch("/api/knowledge", { method: "POST", body: fd });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Upload failed (HTTP ${res.status})`); }
      setRfpUp(false); setRfpFile(null); setRfpTitle(""); setRfpStateVal(""); setRfpTags("");
      load();
    } catch (e) {
      setRfpErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setRfpUploading(false);
    }
  }

  function downloadCsv() {
    const header = ["Title", "Type", "State", "Tags", "Words"];
    const rows = filtered.map((d) => [d.title, KIND_LABEL[d.kind] || d.kind, d.state || "", (d.tags || []).join("; "), String(d.words)]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${isRfp ? "rfp-library" : "knowledge-base"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (learn) return <KnowledgeLearnView onClose={() => { setLearn(false); load(); }} />;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left"><div className="topbar-title">{isRfp ? "RFP library" : "Knowledge base"}</div></div>
        <div className="topbar-right">
          <button className="btn btn-outline" onClick={() => setShowInfo(true)}><i className="ti ti-info-circle" /> Know about me</button>
          {isRfp && (
            <button className="btn btn-primary" onClick={() => { setRfpUp(true); setRfpErr(null); }}><i className="ti ti-upload" /> Upload RFP</button>
          )}
          {!isRfp && (
            <button className="btn btn-outline" onClick={() => { setIngest(true); setIngestMsg(null); setIngestErr(null); }}><i className="ti ti-stack-2" /> Add inception report</button>
          )}
          {!isRfp && (
            <button className="btn btn-primary" onClick={() => setLearn(true)}><i className="ti ti-sparkles" /> Upload &amp; learn</button>
          )}
        </div>
      </div>
      <div className="page-content">
        {/* Stats */}
        <div className="metric-grid">
          <div className="metric-card"><div className="metric-label"><i className="ti ti-files" /> Total documents</div><div className="metric-value">{stats.total}</div></div>
          <div className="metric-card"><div className="metric-label"><i className="ti ti-trophy" /> Winning proposals</div><div className="metric-value">{stats.won}</div></div>
          <div className="metric-card"><div className="metric-label"><i className="ti ti-x" /> Losing proposals</div><div className="metric-value">{stats.lost}</div></div>
          <div className="metric-card"><div className="metric-label"><i className="ti ti-books" /> Reference docs</div><div className="metric-value">{stats.reference}</div></div>
        </div>

        {/* Toolbar */}
        <div className="kb-toolbar">
          <div className="kb-search">
            <i className="ti ti-search" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, state, or tag…" />
          </div>
          <div className="kb-tabs">
            {FILTERS.map((f) => (
              <button key={f.value} className={"gen-tab" + (filterKind === f.value ? " active" : "")} onClick={() => setFilterKind(f.value)}>{f.label}</button>
            ))}
          </div>
          <div className="kb-toolbar-right">
            <button className="btn btn-outline" onClick={downloadCsv}><i className="ti ti-download" /> Download CSV</button>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-num">#</th>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>State</th>
                  <th>Tags</th>
                  <th className="num">Words</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 28 }}><span className="spinner-ring" /></td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>{docs.length ? "No documents match your search." : "Nothing here yet."}</td></tr>
                )}
                {filtered.map((d, i) => (
                  <tr key={d.id}>
                    <td className="col-num">{i + 1}</td>
                    <td>
                      <div className="doc-name">
                        <i className="ti ti-file-text" />
                        {isRfp ? (
                          <button type="button" className="doc-open" onClick={() => setViewer(d)}>{d.title}</button>
                        ) : d.blobUrl ? (
                          <a href={d.blobUrl} target="_blank" rel="noreferrer">{d.title}</a>
                        ) : (
                          d.title
                        )}
                      </div>
                    </td>
                    <td>{KIND_LABEL[d.kind] || d.kind}</td>
                    <td>
                      {d.kind === "winning_proposal" ? (
                        <span className="badge badge-won"><i className="ti ti-circle-check-filled" /> Won</span>
                      ) : d.kind === "losing_proposal" ? (
                        <span className="badge badge-lost"><i className="ti ti-circle-x-filled" /> Lost</span>
                      ) : (
                        <span className="badge badge-ref"><i className="ti ti-file-text" /> Reference</span>
                      )}
                    </td>
                    <td>{d.state || "—"}</td>
                    <td>
                      {d.tags && d.tags.length > 0 ? (
                        <div className="kb-tags">{d.tags.map((t) => <span key={t} className="kb-tag">{t}</span>)}</div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="num">{d.words.toLocaleString("en-IN")}</td>
                    <td className="col-actions">
                      <button className="btn btn-ghost" onClick={() => remove(d.id)} title="Archive"><i className="ti ti-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showInfo && (
        <div className="modal-overlay" onMouseDown={() => setShowInfo(false)}>
          <div className="modal-card kb-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="kb-illus">
              <svg width="112" height="112" viewBox="0 0 112 112" fill="none" aria-hidden="true">
                <circle cx="56" cy="56" r="52" fill="var(--muted)" />
                <rect x="42" y="28" width="38" height="50" rx="6" fill="#fff" stroke="var(--border)" strokeWidth="2" transform="rotate(8 61 53)" />
                <rect x="33" y="30" width="38" height="50" rx="6" fill="#fff" stroke="var(--primary)" strokeWidth="2" />
                <line x1="41" y1="44" x2="63" y2="44" stroke="var(--border)" strokeWidth="3" strokeLinecap="round" />
                <line x1="41" y1="53" x2="63" y2="53" stroke="var(--border)" strokeWidth="3" strokeLinecap="round" />
                <line x1="41" y1="62" x2="55" y2="62" stroke="var(--border)" strokeWidth="3" strokeLinecap="round" />
                <circle cx="70" cy="68" r="15" fill="#fff" stroke="var(--primary)" strokeWidth="2.5" />
                <line x1="81" y1="79" x2="90" y2="88" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M70 61.5 l1.6 4.4 l4.4 1.6 l-4.4 1.6 l-1.6 4.4 l-1.6 -4.4 l-4.4 -1.6 l4.4 -1.6 z" fill="var(--muted-foreground)" />
                <circle cx="28" cy="36" r="2.5" fill="var(--text-hint)" />
                <circle cx="88" cy="34" r="2" fill="var(--text-hint)" />
                <circle cx="26" cy="72" r="2" fill="var(--text-hint)" />
              </svg>
            </div>
            <div className="modal-title">Know about me</div>
            <div className="modal-sub">{isRfp
              ? "Your RFP library — the tenders and requests you're responding to, all in one searchable place."
              : "Your proposal knowledge base — I learn from your past documents to make every new one stronger."}</div>
            <div className="kb-info-secs">
              <div className="kb-info-sec">
                <div className="kb-info-h"><i className="ti ti-sparkles" /> What I can do</div>
                {isRfp ? (
                  <>
                    <p>I keep every RFP you bring in — the tenders and requests a client or department issues — in one place, searchable by title, state, and tag, so you can always find the one you&apos;re answering.</p>
                    <p>Attach an RFP while generating and it&apos;s saved here automatically; the draft is then written to respond to its requirements directly, grounded in your winning proposals.</p>
                  </>
                ) : (
                  <>
                    <p>I turn your past proposals into a living knowledge base. Winning docs, RFPs, and SOPs are retrieved automatically — by state and keywords — to ground every new document you generate.</p>
                    <p>Learning from what won <em>and</em> what lost, I sharpen each draft: stronger structure, the right evidence, and costing patterns that match your best work — so your proposals get better over time.</p>
                  </>
                )}
              </div>
              <div className="kb-info-sec">
                <div className="kb-info-h"><i className="ti ti-list-check" /> How to use</div>
                <ol>
                  {isRfp ? (
                    <>
                      <li>Attach an RFP when you <strong>Generate</strong> (the &ldquo;Responding to an RFP?&rdquo; upload) — it&apos;s saved here automatically.</li>
                      <li>Search or filter by <strong>title, state, or tag</strong> to find a past RFP.</li>
                      <li>Open it to re-read the requirement, or re-attach it to answer a similar tender.</li>
                    </>
                  ) : (
                    <>
                      <li>Click <strong>Upload &amp; learn</strong> and add a document (PDF, DOCX, or TXT).</li>
                      <li>Tag it <strong>Won</strong> or <strong>Lost</strong>, then add the state and tags (e.g. NIPUN, VSK).</li>
                      <li>I distill it into a reusable recipe — winners go on the retrieval shelf; losers teach me what to avoid.</li>
                    </>
                  )}
                </ol>
              </div>
            </div>
            <div className="modal-actions">
              {!isRfp && <button className="btn btn-outline" onClick={() => setShowInfo(false)}>Got it</button>}
              {isRfp ? (
                <button className="btn btn-primary" onClick={() => setShowInfo(false)}><i className="ti ti-check" /> Got it</button>
              ) : (
                <button className="btn btn-primary" onClick={() => { setShowInfo(false); setLearn(true); }}><i className="ti ti-sparkles" /> Upload &amp; learn</button>
              )}
            </div>
          </div>
        </div>
      )}

      {ingest && (
        <div className="modal-overlay" onMouseDown={() => !ingesting && setIngest(false)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 470, textAlign: "left" }}>
            <div className="modal-title" style={{ textAlign: "left" }}><i className="ti ti-stack-2" style={{ color: "var(--primary)", marginRight: 8 }} />Add an inception report</div>
            <div className="modal-sub" style={{ textAlign: "left" }}>I distill it into reusable <strong>patterns</strong> — section chunks the engine can retrieve, plus curated guidance — never lifting specific figures, states, or scheme names. Long documents welcome.</div>
            <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                <span>Document <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· PDF, Word, or text</span></span>
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setIngestFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                <span>State <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· optional</span></span>
                <input className="login-email" style={{ margin: 0 }} value={ingestState} onChange={(e) => setIngestState(e.target.value)} placeholder="e.g. Gujarat" />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                <span>Product id <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· optional</span></span>
                <input className="login-email" style={{ margin: 0 }} value={ingestProduct} onChange={(e) => setIngestProduct(e.target.value)} placeholder="e.g. vsk2" />
              </label>
            </div>
            {ingestErr && <div style={{ marginTop: 14, fontSize: 13, color: "var(--danger, #b0494a)", display: "flex", gap: 7, alignItems: "center" }}><i className="ti ti-alert-triangle" /> {ingestErr}</div>}
            {ingestMsg && <div style={{ marginTop: 14, fontSize: 13, color: "var(--primary)", display: "flex", gap: 7, alignItems: "center" }}><i className="ti ti-circle-check" /> {ingestMsg}</div>}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setIngest(false)} disabled={ingesting}>Close</button>
              <button className="btn btn-primary" onClick={runIngest} disabled={ingesting || !ingestFile}>
                {ingesting ? <><span className="spinner-ring" /> Distilling…</> : <><i className="ti ti-sparkles" /> Distill &amp; save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {rfpUp && (
        <div className="modal-overlay" onMouseDown={() => !rfpUploading && setRfpUp(false)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 470, textAlign: "left" }}>
            <div className="modal-title" style={{ textAlign: "left" }}><i className="ti ti-file-upload" style={{ color: "var(--primary)", marginRight: 8 }} />Upload an RFP</div>
            <div className="modal-sub" style={{ textAlign: "left" }}>Add a tender / RFP to the library — searchable by title, state and tag, and re-attachable when you respond to a similar tender.</div>
            <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                <span>RFP document <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· PDF, Word, or text</span></span>
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setRfpFile(e.target.files?.[0] || null)} style={{ fontSize: 13 }} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                <span>Title <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· optional</span></span>
                <input className="login-email" style={{ margin: 0 }} value={rfpTitle} onChange={(e) => setRfpTitle(e.target.value)} placeholder="e.g. Vidya Utkarsh EMMS RFP" />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                <span>State <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· optional</span></span>
                <select className="login-email" style={{ margin: 0 }} value={rfpStateVal} onChange={(e) => setRfpStateVal(e.target.value)}>
                  <option value="">Select state</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                <span>Tags <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>· comma-separated, optional</span></span>
                <input className="login-email" style={{ margin: 0 }} value={rfpTags} onChange={(e) => setRfpTags(e.target.value)} placeholder="rfp, emms, qcbs" />
              </label>
            </div>
            {rfpErr && <div style={{ marginTop: 14, fontSize: 13, color: "var(--danger, #b0494a)", display: "flex", gap: 7, alignItems: "center" }}><i className="ti ti-alert-triangle" /> {rfpErr}</div>}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setRfpUp(false)} disabled={rfpUploading}>Close</button>
              <button className="btn btn-primary" onClick={uploadRfp} disabled={rfpUploading || !rfpFile}>
                {rfpUploading ? <><span className="spinner-ring" /> Uploading…</> : <><i className="ti ti-upload" /> Upload to library</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewer && <RfpViewer doc={viewer} onClose={() => setViewer(null)} />}
    </>
  );
}
