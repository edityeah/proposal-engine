"use client";

import { useMemo, useRef, useState } from "react";
import { PRODUCTS, INDIVIDUAL_MODULES } from "@/data/products";
import { GENERATORS } from "@/data/generators";
import {
  ORGS,
  STATES,
  SUBMISSION_TYPES,
  DURATIONS,
  IMPLEMENTING_PARTNERS,
} from "@/config/orgs";
import type { ProposalInputs } from "@/lib/types";

const VSK_PRODUCTS = PRODUCTS.filter((p) => p.type === "vsk");
const VAI_PRODUCTS = PRODUCTS.filter((p) => p.type === "vai");

function surroundId(s: string) {
  return s.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

export default function GenerateForm({
  onGenerate,
  busy,
}: {
  onGenerate: (inputs: ProposalInputs) => void;
  busy: boolean;
}) {
  const [generatorId, setGeneratorId] = useState<string>(GENERATORS[0].id);
  const [proposalType, setProposalType] = useState<"vsk" | "vai" | "module">("vsk");

  const [vskVersion, setVskVersion] = useState<string>(VSK_PRODUCTS[0]?.id ?? "vsk1");
  const [checkedModules, setCheckedModules] = useState<Set<string>>(() => {
    const p = VSK_PRODUCTS[0];
    return new Set<string>((p?.modules ?? []).map((m: { id: string }) => m.id));
  });

  const [vaiPackage, setVaiPackage] = useState<string>(VAI_PRODUCTS[0]?.id ?? "");
  const [checkedSurround, setCheckedSurround] = useState<Set<string>>(new Set());

  const [moduleQuery, setModuleQuery] = useState("");
  const [singleModule, setSingleModule] = useState<{ id: string; name: string; package: string } | null>(null);

  const [org, setOrg] = useState("direct");
  const [psuContext, setPsuContext] = useState("");

  const [form, setForm] = useState({
    state: "",
    department: "",
    submissionType: SUBMISSION_TYPES[0],
    schools: "",
    grades: "",
    students: "",
    teachers: "",
    duration: "",
    implementingPartner: "",
    budget: "",
    cm2: "",
    context: "",
    differentiators: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // RFP
  const [rfp, setRfp] = useState<{ filename: string; words: number; text: string; blobUrl?: string } | null>(null);
  const [rfpReading, setRfpReading] = useState(false);
  const [rfpWarn, setRfpWarn] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState("");

  const vskProduct = useMemo(() => VSK_PRODUCTS.find((p) => p.id === vskVersion), [vskVersion]);
  const vaiProduct = useMemo(() => VAI_PRODUCTS.find((p) => p.id === vaiPackage), [vaiPackage]);
  const generator = useMemo(() => GENERATORS.find((g) => g.id === generatorId), [generatorId]);

  function selectVskVersion(id: string) {
    setVskVersion(id);
    const p = VSK_PRODUCTS.find((x) => x.id === id);
    setCheckedModules(new Set<string>((p?.modules ?? []).map((m: { id: string }) => m.id)));
  }

  function toggleModule(id: string, on: boolean) {
    setCheckedModules((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function checkAll(on: boolean) {
    const next = new Set<string>();
    (vskProduct?.modules ?? []).forEach((m: { id: string; mandatory?: boolean }) => {
      if (on || m.mandatory) next.add(m.id);
    });
    setCheckedModules(next);
  }

  function toggleSurround(id: string, on: boolean) {
    setCheckedSurround((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const moduleResults = useMemo(() => {
    const q = moduleQuery.trim().toLowerCase();
    if (!q) return INDIVIDUAL_MODULES.slice(0, 20);
    return INDIVIDUAL_MODULES.filter(
      (m) => m.name.toLowerCase().includes(q) || m.package.toLowerCase().includes(q),
    );
  }, [moduleQuery]);

  async function handleFile(file: File) {
    setRfpReading(true);
    setRfpWarn("");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/rfp/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setRfpWarn(data.error || "Could not read this file.");
        setRfp(null);
      } else {
        setRfp({ filename: data.filename, words: data.words, text: data.text, blobUrl: data.blobUrl });
        set("submissionType", "Response to RFP");
      }
    } catch {
      setRfpWarn("Upload failed. Try again.");
    } finally {
      setRfpReading(false);
    }
  }

  function buildInputs(): { inputs?: ProposalInputs; error?: string } {
    let product: { id: string; name: string; tagline?: string; description?: string; objective?: string; systemPrompt?: string; modules?: { id: string; name: string }[]; coreModules?: string[]; surroundSupport?: string[] } | undefined;
    if (proposalType === "vsk") product = vskProduct;
    else if (proposalType === "vai") product = vaiProduct;
    else product = undefined; // single module path below

    let selectedModuleNames: string[] = [];
    let selectedSurroundNames: string[] = [];
    let singleModuleName: string | null = null;
    let productId = "";
    let productName = "";
    let productTagline = "";
    let productObjective = "";
    let systemPrompt = "";

    if (proposalType === "vsk" && vskProduct) {
      productId = vskProduct.id;
      productName = vskProduct.name;
      productTagline = vskProduct.tagline || vskProduct.description || "";
      productObjective = vskProduct.objective || "";
      systemPrompt = vskProduct.systemPrompt || "";
      selectedModuleNames = (vskProduct.modules ?? [])
        .filter((m: { id: string }) => checkedModules.has(m.id))
        .map((m: { name: string }) => m.name);
    } else if (proposalType === "vai" && vaiProduct) {
      productId = vaiProduct.id;
      productName = vaiProduct.name;
      productTagline = vaiProduct.tagline || vaiProduct.description || "";
      productObjective = vaiProduct.objective || "";
      systemPrompt = vaiProduct.systemPrompt || "";
      selectedModuleNames = (vaiProduct.coreModules ?? []).slice();
      selectedSurroundNames = (vaiProduct.surroundSupport ?? []).filter((s: string) =>
        checkedSurround.has(surroundId(s)),
      );
    } else if (proposalType === "module" && singleModule) {
      // Single modules inherit the system prompt of their parent VSK package.
      const parent = PRODUCTS.find((p) => p.name === singleModule.package) || VSK_PRODUCTS[0];
      productId = singleModule.id;
      productName = singleModule.name;
      productTagline = singleModule.package;
      systemPrompt = parent?.systemPrompt || "";
      singleModuleName = `${singleModule.name} (from ${singleModule.package})`;
    }

    if (!systemPrompt) return { error: "Please select a product / module." };

    const inputs: ProposalInputs = {
      productId,
      productName,
      productTagline,
      productObjective,
      systemPrompt,
      generatorId: generator?.id || "",
      generatorLabel: generator?.label || "",
      generatorPrefix: generator?.promptPrefix || "",
      proposalType,
      selectedModuleNames,
      selectedSurroundNames,
      singleModuleName,
      ...form,
      org,
      psuContext,
      rfpLoaded: !!rfp,
      rfpText: rfp?.text ? rfp.text.substring(0, 12000) : "",
      rfpFilename: rfp?.filename,
      rfpBlobUrl: rfp?.blobUrl,
    };

    if (!inputs.state) return { error: "Please select a state." };
    if (!inputs.department.trim()) return { error: "Please enter the issuing department." };
    return { inputs };
  }

  function submit() {
    const { inputs, error: e } = buildInputs();
    if (e || !inputs) {
      setError(e || "Missing fields.");
      return;
    }
    setError("");
    onGenerate(inputs);
  }

  const stepActive = (n: number) => {
    if (n === 1) return rfp ? "done" : "active";
    if (n === 2) return org !== "direct" ? "done" : "";
    if (n === 3) return "";
    return "";
  };

  return (
    <div className="page-content">
      <div className="step-flow">
        <div className={"step-item " + stepActive(1)}><span className="step-num">1</span><i className="ti ti-file-search" /> <span className="step-label">RFP check</span></div>
        <div className={"step-item " + stepActive(2)}><span className="step-num">2</span><i className="ti ti-building-bank" /> <span className="step-label">Organisation</span></div>
        <div className="step-item"><span className="step-num">3</span><i className="ti ti-box" /> <span className="step-label">Product &amp; scope</span></div>
        <div className="step-item"><span className="step-num">4</span><i className="ti ti-sparkles" /> <span className="step-label">Generate</span></div>
      </div>

      {/* Generator tabs */}
      <div className="generator-tabs">
        {GENERATORS.map((g) => (
          <button
            key={g.id}
            className={"gen-tab" + (g.id === generatorId ? " active" : "")}
            onClick={() => setGeneratorId(g.id)}
          >
            <i className={"ti " + g.icon} /> {g.label}
          </button>
        ))}
      </div>

      {/* RFP */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><i className="ti ti-file-search" /> Is this in response to an RFP?</div>
          <div className={"tag" + (rfp ? " tag-teal" : "")}>
            <i className={"ti " + (rfp ? "ti-circle-check" : "ti-circle-dashed")} />{" "}
            {rfp ? rfp.filename : "No RFP uploaded"}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {!rfp && !rfpReading && (
          <div
            className="upload-zone"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("drag")}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("drag"); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          >
            <i className="ti ti-cloud-upload" />
            <div className="upload-zone-title">Click or drop an RFP to upload</div>
            <div className="upload-zone-sub">PDF, Word (.docx), or text · the proposal will address every requirement</div>
          </div>
        )}
        {rfpReading && (
          <div style={{ padding: "10px 0", display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 12 }}>
            <span className="spinner-ring" /> Reading and extracting the document…
          </div>
        )}
        {rfpWarn && <div className="banner warn"><i className="ti ti-alert-triangle" /><div>{rfpWarn}</div></div>}
        {rfp && (
          <div className="banner success">
            <i className="ti ti-circle-check" />
            <div style={{ flex: 1 }}>
              <strong>{rfp.filename}</strong><br />
              <span style={{ fontSize: 12 }}>
                {rfp.words.toLocaleString("en-IN")} words extracted — proposal will address all RFP requirements
              </span>
            </div>
            <button className="btn btn-outline" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => { setRfp(null); if (fileRef.current) fileRef.current.value = ""; }}>
              <i className="ti ti-x" /> Remove
            </button>
          </div>
        )}
      </div>

      {/* Organisation */}
      <div className="card">
        <div className="card-header"><div className="card-title"><i className="ti ti-building" /> Submitting organisation</div></div>
        <div className="org-cards">
          {ORGS.map((o) => (
            <div key={o.id} className={"org-card" + (org === o.id ? " selected" : "")} onClick={() => setOrg(o.id)}>
              <i className={"ti " + o.icon} /><div className="org-card-name">{o.name}</div>
            </div>
          ))}
        </div>
        {org !== "direct" && (
          <div style={{ marginTop: 14 }}>
            <div className="card-divider" />
            <div className="field">
              <label><i className="ti ti-info-circle" /> PSU context <span style={{ fontWeight: 400, color: "var(--text-hint)" }}>(feeds proposal framing)</span></label>
              <textarea value={psuContext} onChange={(e) => setPsuContext(e.target.value)} placeholder="e.g. TCIL submits as lead bidder; ConveGenius is the technology partner providing the VSK platform…" />
            </div>
          </div>
        )}
      </div>

      {/* Product selector */}
      <div className="card">
        <div className="card-header"><div className="card-title"><i className="ti ti-box" /> Product / package</div></div>
        <div style={{ marginBottom: 16 }}>
          <div className="section-label">What type of proposal?</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={"proposal-type-btn" + (proposalType === "vsk" ? " active" : "")} onClick={() => setProposalType("vsk")}>
              <i className="ti ti-device-desktop-analytics" /> VSK Platform <span style={{ fontSize: 10, opacity: 0.7 }}>(modular)</span>
            </button>
            <button className={"proposal-type-btn" + (proposalType === "vai" ? " active" : "")} onClick={() => setProposalType("vai")}>
              <i className="ti ti-package" /> VAI Package <span style={{ fontSize: 10, opacity: 0.7 }}>(standalone)</span>
            </button>
            <button className={"proposal-type-btn" + (proposalType === "module" ? " active" : "")} onClick={() => setProposalType("module")}>
              <i className="ti ti-puzzle" /> Single module / bot
            </button>
          </div>
        </div>

        {proposalType === "vsk" && (
          <div>
            <div className="section-label">VSK version</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {VSK_PRODUCTS.map((p) => (
                <button key={p.id} className={"vsk-version-btn" + (p.id === vskVersion ? " active" : "")} onClick={() => selectVskVersion(p.id)}>
                  <strong>{p.name}</strong><br />
                  <span style={{ fontSize: 11, opacity: 0.8 }}>{p.tagline} — {(p.modules ?? []).length} modules</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", background: "var(--bg-page)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{vskProduct?.name} — select modules</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => checkAll(true)} className="btn btn-outline" style={{ fontSize: 11, padding: "3px 10px" }}>Select all</button>
                  <button onClick={() => checkAll(false)} className="btn btn-outline" style={{ fontSize: 11, padding: "3px 10px" }}>Clear all</button>
                </div>
              </div>
              <div className="check-grid" style={{ padding: "12px 14px", maxHeight: 280, overflowY: "auto" }}>
                {(vskProduct?.modules ?? []).map((m: { id: string; name: string; mandatory?: boolean; note?: string }) => (
                  <label key={m.id} className={"module-check-item" + (m.mandatory ? " mandatory" : "")}>
                    <input
                      type="checkbox"
                      checked={checkedModules.has(m.id)}
                      disabled={m.mandatory}
                      onChange={(e) => toggleModule(m.id, e.target.checked)}
                    />
                    <div className="mod-name">
                      {m.name}
                      {m.mandatory && <span className="mod-mandatory"> ● Required</span>}
                      {m.note && <><br /><span style={{ fontSize: 10, color: "var(--text-hint)", fontStyle: "italic" }}>{m.note}</span></>}
                    </div>
                  </label>
                ))}
              </div>
              <div style={{ padding: "8px 14px", background: "var(--bg-page)", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)" }}>
                {checkedModules.size} modules selected
              </div>
            </div>
          </div>
        )}

        {proposalType === "vai" && (
          <div>
            <div className="section-label">VAI package</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
              {VAI_PRODUCTS.map((p) => (
                <div key={p.id} className={"vai-pkg-card" + (p.id === vaiPackage ? " selected" : "")} onClick={() => { setVaiPackage(p.id); setCheckedSurround(new Set()); }}>
                  <div className="vai-pkg-name">{p.name}</div>
                  <div className="vai-pkg-desc">{p.description}</div>
                </div>
              ))}
            </div>
            {(vaiProduct?.surroundSupport ?? []).length > 0 && (
              <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", background: "var(--bg-page)", borderBottom: "1px solid var(--border)", fontSize: 12, fontWeight: 600 }}>
                  Surround support <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
                </div>
                <div className="check-grid" style={{ padding: "12px 14px" }}>
                  {(vaiProduct?.surroundSupport ?? []).map((s: string) => (
                    <label key={s} className="module-check-item">
                      <input type="checkbox" checked={checkedSurround.has(surroundId(s))} onChange={(e) => toggleSurround(surroundId(s), e.target.checked)} />
                      <div className="mod-name">{s}</div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {proposalType === "module" && (
          <div>
            <div className="section-label">Search and select module</div>
            <input type="text" placeholder="Search: NIPUN Bot, TPD Bot, FMB, TIMS, OCR, PLC…" value={moduleQuery} onChange={(e) => setModuleQuery(e.target.value)} style={{ marginBottom: 8 }} />
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", maxHeight: 220, overflowY: "auto" }}>
              {moduleResults.length === 0 && <div style={{ padding: 12, fontSize: 12, color: "var(--text-muted)" }}>No modules found</div>}
              {moduleResults.map((m) => (
                <div key={m.id} className="module-search-item" onClick={() => { setSingleModule(m); setModuleQuery(m.name); }}>
                  <span>{m.name}</span><span className="module-search-pkg">{m.package}</span>
                </div>
              ))}
            </div>
            {singleModule && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--navy-50)", border: "1.5px solid var(--navy-300)", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, color: "var(--navy-700)" }}>
                <i className="ti ti-check" style={{ color: "var(--teal-700)" }} /> Selected: <strong>{singleModule.name}</strong> from {singleModule.package}
              </div>
            )}
          </div>
        )}
      </div>

      {/* State & department */}
      <div className="card">
        <div className="card-header"><div className="card-title"><i className="ti ti-map-pin" /> State & department</div></div>
        <div className="grid-2">
          <div className="field">
            <label><i className="ti ti-map" /> State <span className="req">*</span></label>
            <select value={form.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">Select state</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label><i className="ti ti-building-community" /> Issuing / receiving department <span className="req">*</span></label>
            <input type="text" value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Samagra Shiksha, DoSE, DHE…" />
          </div>
        </div>
        <div style={{ marginTop: 12 }} className="field">
          <label><i className="ti ti-send" /> Submission type</label>
          <select value={form.submissionType} onChange={(e) => set("submissionType", e.target.value)}>
            {SUBMISSION_TYPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Scale */}
      <div className="card">
        <div className="card-header"><div className="card-title"><i className="ti ti-chart-bar" /> Programme scale</div></div>
        <div className="grid-3">
          <div className="field"><label><i className="ti ti-school" /> Schools</label><input type="number" value={form.schools} onChange={(e) => set("schools", e.target.value)} placeholder="e.g. 15000" min={0} /></div>
          <div className="field"><label><i className="ti ti-stack-2" /> Grades</label><input type="text" value={form.grades} onChange={(e) => set("grades", e.target.value)} placeholder="e.g. 1–8" /></div>
          <div className="field"><label><i className="ti ti-users" /> Students</label><input type="number" value={form.students} onChange={(e) => set("students", e.target.value)} placeholder="e.g. 850000" min={0} /></div>
          <div className="field"><label><i className="ti ti-chalkboard" /> Teachers</label><input type="number" value={form.teachers} onChange={(e) => set("teachers", e.target.value)} placeholder="e.g. 35000" min={0} /></div>
          <div className="field"><label><i className="ti ti-calendar" /> Duration</label>
            <select value={form.duration} onChange={(e) => set("duration", e.target.value)}>
              <option value="">Select</option>{DURATIONS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="field"><label><i className="ti ti-building-factory-2" /> Implementing partner</label>
            <select value={form.implementingPartner} onChange={(e) => set("implementingPartner", e.target.value)}>
              <option value="">None / direct</option>{IMPLEMENTING_PARTNERS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Budget */}
      <div className="card">
        <div className="card-header"><div className="card-title"><i className="ti ti-coin-rupee" /> Budget & margin</div></div>
        <div className="grid-2">
          <div className="field"><label><i className="ti ti-moneybag" /> Available budget (₹ Cr)</label>
            <input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="e.g. 16.08" step="0.1" min={0} />
            <span className="hint"><i className="ti ti-info-circle" /> Leave blank if not specified</span>
          </div>
          <div className="field"><label><i className="ti ti-percentage" /> Target gross margin post CM2 (%)</label>
            <input type="number" value={form.cm2} onChange={(e) => set("cm2", e.target.value)} placeholder="e.g. 40" step="0.5" min={0} max={100} />
          </div>
        </div>
      </div>

      {/* Context */}
      <div className="card">
        <div className="card-header"><div className="card-title"><i className="ti ti-notes" /> Context & priorities</div></div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label><i className="ti ti-target" /> Key objectives or context <span style={{ fontWeight: 400, color: "var(--text-hint)" }}>(improves output)</span></label>
          <textarea value={form.context} onChange={(e) => set("context", e.target.value)} placeholder="e.g. State targeting NIPUN by 2026, PAB review in March, CG has an existing HP deployment…" />
        </div>
        <div className="field">
          <label><i className="ti ti-award" /> Key differentiators to highlight</label>
          <textarea value={form.differentiators} onChange={(e) => set("differentiators", e.target.value)} placeholder="e.g. Existing VSK deployment in HP, APAAR integration, offline capability…" style={{ minHeight: 64 }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
        <button className="btn btn-primary" disabled={busy} onClick={submit} style={{ fontSize: 14, padding: "12px 28px" }}>
          <i className="ti ti-sparkles" /> {busy ? "Generating…" : `Generate ${generator?.label?.replace(/^Generate /, "") || "proposal"}`}
        </button>
        <span style={{ fontSize: 12, color: "var(--text-hint)" }}><span className="req">*</span> required fields</span>
      </div>

      {error && <div className="error-bar"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
    </div>
  );
}
