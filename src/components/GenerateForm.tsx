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

// Sub-labels for the flat side-panel org cards
const ORG_SUB: Record<string, string> = { direct: "ConveGenius as prime", other: "Via a PSU partner" };

function surroundId(s: string) {
  return s.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

// RFP responses split into a technical bid and a financial/commercial bid. The
// user picks which to draft; the choice is appended to the generator prompt.
type RfpType = "technical" | "financial" | "both";
const RFP_TYPE_OPTIONS: { id: RfpType; label: string; icon: string; sub: string }[] = [
  { id: "technical", label: "Technical", icon: "ti-settings-cog", sub: "Technical bid only" },
  { id: "financial", label: "Financial", icon: "ti-currency-rupee", sub: "Priced commercial bid" },
  { id: "both", label: "Both", icon: "ti-files", sub: "Technical + financial" },
];
const RFP_TYPE_NOTE: Record<RfpType, string> = {
  technical:
    "SCOPE OF THIS RESPONSE: Produce ONLY the TECHNICAL bid. Cover the technical response in full (understanding, solution architecture, approach & timeline, team, past experience, SLAs, risk). Do NOT include commercial pricing, the priced Bill of Quantities, or the financial bid.",
  financial:
    "SCOPE OF THIS RESPONSE: Produce ONLY the FINANCIAL / commercial bid. Give the priced Bill of Quantities, a cost break-up mapped to each scope item and PAB / budget head (component → physical units → unit cost → total → amount in ₹ lakhs, tagged R/NR), payment milestones, taxes, and commercial terms. Keep any technical narrative to a brief one-paragraph context. Never fabricate a rate — use a clearly-marked [INSERT: …] placeholder for any unknown unit cost.",
  both:
    "SCOPE OF THIS RESPONSE: Produce BOTH bids in ONE document, clearly separated — 'Part A — Technical Bid' (the full technical response) followed by 'Part B — Financial Bid' (priced Bill of Quantities, cost break-up mapped to scope items and PAB / budget heads, payment schedule, taxes, commercial terms). Never fabricate a rate — use a clearly-marked [INSERT: …] placeholder for any unknown unit cost.",
};

export interface GenFormSnapshot {
  generatorId: string;
  proposalType: "vsk" | "vai" | "module";
  vskVersion: string;
  moduleIds: string[];
  vaiPackage: string;
  surroundIds: string[];
  singleModule: { id: string; name: string; package: string } | null;
  org: string;
  psuContext: string;
  form: {
    state: string; department: string; submissionType: string;
    schools: string; grades: string; students: string; teachers: string;
    duration: string; implementingPartner: string; budget: string; cm2: string;
    context: string; differentiators: string;
  };
  rfp: { filename: string; words: number; text: string; blobUrl?: string } | null;
  sections: string[];
  additionalInstructions: string;
  rfpType?: RfpType;
}

export default function GenerateForm({
  onGenerate,
  busy,
  initialGeneratorId,
  mode = "full",
  defaults,
}: {
  onGenerate: (inputs: ProposalInputs, snapshot: GenFormSnapshot) => void;
  busy: boolean;
  initialGeneratorId?: string | null;
  mode?: "full" | "panel";
  defaults?: GenFormSnapshot;
}) {
  const initialGenId =
    defaults?.generatorId && GENERATORS.some((g) => g.id === defaults.generatorId)
      ? defaults.generatorId
      : initialGeneratorId && GENERATORS.some((g) => g.id === initialGeneratorId)
        ? initialGeneratorId
        : GENERATORS[0].id;
  const [generatorId, setGeneratorId] = useState<string>(initialGenId);
  const [rfpType, setRfpType] = useState<RfpType>(defaults?.rfpType ?? "both");
  const [proposalType, setProposalType] = useState<"vsk" | "vai" | "module">(defaults?.proposalType ?? "vsk");

  const [vskVersion, setVskVersion] = useState<string>(defaults?.vskVersion ?? VSK_PRODUCTS[0]?.id ?? "vsk1");
  const [checkedModules, setCheckedModules] = useState<Set<string>>(() =>
    defaults?.moduleIds
      ? new Set<string>(defaults.moduleIds)
      : new Set<string>((VSK_PRODUCTS[0]?.modules ?? []).map((m: { id: string }) => m.id)),
  );

  const [vaiPackage, setVaiPackage] = useState<string>(defaults?.vaiPackage ?? VAI_PRODUCTS[0]?.id ?? "");
  const [checkedSurround, setCheckedSurround] = useState<Set<string>>(() => new Set<string>(defaults?.surroundIds ?? []));

  const [moduleQuery, setModuleQuery] = useState("");
  const [singleModule, setSingleModule] = useState<{ id: string; name: string; package: string } | null>(defaults?.singleModule ?? null);

  const [org, setOrg] = useState(defaults?.org ?? "direct");
  const [psuContext, setPsuContext] = useState(defaults?.psuContext ?? "");

  const [form, setForm] = useState({
    state: defaults?.form.state ?? "",
    department: defaults?.form.department ?? "",
    submissionType: defaults?.form.submissionType ?? SUBMISSION_TYPES[0],
    schools: defaults?.form.schools ?? "",
    grades: defaults?.form.grades ?? "",
    students: defaults?.form.students ?? "",
    teachers: defaults?.form.teachers ?? "",
    duration: defaults?.form.duration ?? "",
    implementingPartner: defaults?.form.implementingPartner ?? "",
    budget: defaults?.form.budget ?? "",
    cm2: defaults?.form.cm2 ?? "",
    context: defaults?.form.context ?? "",
    differentiators: defaults?.form.differentiators ?? "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const [sections, setSections] = useState<Set<string>>(() =>
    defaults?.sections
      ? new Set<string>(defaults.sections)
      : new Set<string>((GENERATORS.find((g) => g.id === initialGenId)?.sections as string[]) ?? []),
  );
  const [additionalInstructions, setAdditionalInstructions] = useState(defaults?.additionalInstructions ?? "");
  const [modulesOpen, setModulesOpen] = useState(false);

  // RFP
  const [rfp, setRfp] = useState<{ filename: string; words: number; text: string; blobUrl?: string } | null>(defaults?.rfp ?? null);
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

  function selectGenerator(id: string) {
    setGeneratorId(id);
    const g = GENERATORS.find((x) => x.id === id);
    setSections(new Set<string>((g?.sections as string[]) ?? []));
  }
  function toggleSection(name: string, on: boolean) {
    setSections((prev) => { const next = new Set(prev); if (on) next.add(name); else next.delete(name); return next; });
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
      fd.append("toLibrary", "1");            // also save this RFP to the RFP library
      fd.append("state", form.state || "");
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
      generatorLabel: generator?.id === "rfp_response" ? `${generator.label} · ${rfpType === "both" ? "Technical + Financial" : rfpType === "financial" ? "Financial" : "Technical"}` : (generator?.label || ""),
      generatorPrefix: generator?.id === "rfp_response"
        ? `${generator.promptPrefix || ""}\n\n${RFP_TYPE_NOTE[rfpType]}`
        : (generator?.promptPrefix || ""),
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
      sections: Array.from(sections),
      additionalInstructions: additionalInstructions.trim(),
    };

    if (!inputs.state) return { error: "Please select a state." };
    if (!inputs.department.trim()) return { error: "Please enter the issuing department." };
    return { inputs };
  }

  function buildSnapshot(): GenFormSnapshot {
    return {
      generatorId, proposalType, vskVersion,
      moduleIds: Array.from(checkedModules),
      vaiPackage, surroundIds: Array.from(checkedSurround),
      singleModule, org, psuContext, form, rfp,
      sections: Array.from(sections),
      additionalInstructions,
      rfpType,
    };
  }

  function submit() {
    const { inputs, error: e } = buildInputs();
    if (e || !inputs) {
      setError(e || "Missing fields.");
      return;
    }
    setError("");
    onGenerate(inputs, buildSnapshot());
  }

  // ── Flat side-panel layout (shown beside the generated document) ──
  if (mode === "panel") {
    return (
      <div className="page-content gen-panel">
        <div className="gen-panel-head">
          <div className="gen-panel-title"><i className="ti ti-adjustments" /> Generation inputs</div>
          <div className="gen-panel-sub">Edit any field, then regenerate the document.</div>
        </div>

        {/* Document type */}
        <div className="psec">
          <div className="section-label">Document type</div>
          <select className="gen-select" value={generatorId} onChange={(e) => selectGenerator(e.target.value)}>
            {GENERATORS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </div>

        {/* Responding to RFP */}
        <div className="psec">
          <div className="section-label">Responding to RFP</div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          {rfp ? (
            <div className="prfp">
              <div className="prfp-ico"><i className="ti ti-file-text" /></div>
              <div className="prfp-meta">
                <div className="prfp-name">{rfp.filename}</div>
                <div className="prfp-sub">{rfp.words.toLocaleString("en-IN")} words extracted</div>
              </div>
              <button className="prfp-btn" onClick={() => fileRef.current?.click()}><i className="ti ti-refresh" /> Replace</button>
            </div>
          ) : (
            <button className="gen-select gen-select-btn" onClick={() => fileRef.current?.click()}>
              <span style={{ color: "var(--text-hint)" }}>Click to upload an RFP (optional)</span>
              <i className="ti ti-cloud-upload" />
            </button>
          )}
          {rfpReading && <div className="prfp-loading"><span className="spinner-ring" /> Reading and extracting…</div>}
          {rfpWarn && <div className="banner warn" style={{ marginTop: 8 }}><i className="ti ti-alert-triangle" /><div>{rfpWarn}</div></div>}
        </div>

        {/* Submitting organisation */}
        <div className="psec">
          <div className="section-label">Submitting organisation</div>
          <div className="porg-list">
            {ORGS.map((o) => (
              <div key={o.id} className={"porg" + (org === o.id ? " selected" : "")} onClick={() => setOrg(o.id)}>
                <i className={"ti " + o.icon} />
                <div>
                  <div className="porg-name">{o.name}</div>
                  <div className="porg-sub">{ORG_SUB[o.id] ?? ""}</div>
                </div>
              </div>
            ))}
          </div>
          {org !== "direct" && (
            <div className="field" style={{ marginTop: 12 }}>
              <label><i className="ti ti-info-circle" /> PSU context</label>
              <textarea value={psuContext} onChange={(e) => setPsuContext(e.target.value)} placeholder="e.g. TCIL submits as lead bidder; ConveGenius is the technology partner…" />
            </div>
          )}
        </div>

        {/* Product / package */}
        <div className="psec">
          <div className="section-label">Product / package</div>
          <select className="gen-select" value={proposalType} onChange={(e) => setProposalType(e.target.value as "vsk" | "vai" | "module")}>
            <option value="vsk">VSK Platform (modular)</option>
            <option value="vai">VAI Package (standalone)</option>
            <option value="module">Single module / bot</option>
          </select>
        </div>

        {/* VSK version + modules */}
        {proposalType === "vsk" && (
          <>
            <div className="psec">
              <div className="section-label">VSK version</div>
              <select className="gen-select" value={vskVersion} onChange={(e) => selectVskVersion(e.target.value)}>
                {VSK_PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.tagline} — {(p.modules ?? []).length} modules</option>)}
              </select>
            </div>
            <div className="psec">
              <div className="section-label-row">
                <div className="section-label">{vskProduct?.name} modules</div>
                <div className="psec-actions">
                  <button onClick={() => checkAll(true)}>All</button>
                  <button onClick={() => checkAll(false)}>Clear</button>
                </div>
              </div>
              <button className="gen-select gen-select-btn" onClick={() => setModulesOpen((v) => !v)}>
                <span>{checkedModules.size} modules selected</span>
                <i className={"ti " + (modulesOpen ? "ti-chevron-up" : "ti-chevron-down")} />
              </button>
              {modulesOpen && (
                <div className="pmodules">
                  {(vskProduct?.modules ?? []).map((m: { id: string; name: string; mandatory?: boolean }) => (
                    <label key={m.id} className="section-check">
                      <input type="checkbox" checked={checkedModules.has(m.id)} disabled={m.mandatory} onChange={(e) => toggleModule(m.id, e.target.checked)} />
                      <span>{m.name}{m.mandatory && <span className="mod-mandatory"> · required</span>}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* VAI package */}
        {proposalType === "vai" && (
          <div className="psec">
            <div className="section-label">VAI package</div>
            <select className="gen-select" value={vaiPackage} onChange={(e) => { setVaiPackage(e.target.value); setCheckedSurround(new Set()); }}>
              {VAI_PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {(vaiProduct?.surroundSupport ?? []).length > 0 && (
              <div className="pmodules" style={{ marginTop: 8 }}>
                {(vaiProduct?.surroundSupport ?? []).map((s: string) => (
                  <label key={s} className="section-check">
                    <input type="checkbox" checked={checkedSurround.has(surroundId(s))} onChange={(e) => toggleSurround(surroundId(s), e.target.checked)} />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Single module */}
        {proposalType === "module" && (
          <div className="psec">
            <div className="section-label">Module / bot</div>
            <div className="field">
              <input type="text" placeholder="Search: NIPUN Bot, TPD Bot, FMB, TIMS…" value={moduleQuery} onChange={(e) => setModuleQuery(e.target.value)} />
            </div>
            <div className="pmodules" style={{ marginTop: 8 }}>
              {moduleResults.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "4px 2px" }}>No modules found</div>}
              {moduleResults.slice(0, 8).map((m) => (
                <div key={m.id} className="module-search-item" onClick={() => { setSingleModule(m); setModuleQuery(m.name); }}>
                  <span>{m.name}</span><span className="module-search-pkg">{m.package}</span>
                </div>
              ))}
            </div>
            {singleModule && <div className="psec-note"><i className="ti ti-check" /> Selected: <strong>{singleModule.name}</strong> from {singleModule.package}</div>}
          </div>
        )}

        {/* State & department */}
        <div className="psec">
          <div className="section-label">State &amp; department</div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>State <span className="req">*</span></label>
            <select value={form.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">Select state</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Issuing / receiving department <span className="req">*</span></label>
            <input type="text" value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Samagra Shiksha, DoSE, DHE…" />
          </div>
          <div className="field">
            <label>Submission type</label>
            <select value={form.submissionType} onChange={(e) => set("submissionType", e.target.value)}>
              {SUBMISSION_TYPES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Programme scale */}
        <div className="psec">
          <div className="section-label">Programme scale</div>
          <div className="grid-2">
            <div className="field"><label>Schools</label><input type="number" value={form.schools} onChange={(e) => set("schools", e.target.value)} placeholder="15000" min={0} /></div>
            <div className="field"><label>Grades</label><input type="text" value={form.grades} onChange={(e) => set("grades", e.target.value)} placeholder="1–8" /></div>
            <div className="field"><label>Students</label><input type="number" value={form.students} onChange={(e) => set("students", e.target.value)} placeholder="850000" min={0} /></div>
            <div className="field"><label>Teachers</label><input type="number" value={form.teachers} onChange={(e) => set("teachers", e.target.value)} placeholder="35000" min={0} /></div>
            <div className="field"><label>Duration</label>
              <select value={form.duration} onChange={(e) => set("duration", e.target.value)}><option value="">Select</option>{DURATIONS.map((d) => <option key={d}>{d}</option>)}</select>
            </div>
            <div className="field"><label>Implementing partner</label>
              <select value={form.implementingPartner} onChange={(e) => set("implementingPartner", e.target.value)}><option value="">None / direct</option>{IMPLEMENTING_PARTNERS.map((p) => <option key={p}>{p}</option>)}</select>
            </div>
          </div>
        </div>

        {/* Budget & margin */}
        <div className="psec">
          <div className="section-label">Budget &amp; margin</div>
          <div className="grid-2">
            <div className="field"><label>Available budget (₹ Cr)</label><input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="16.08" step="0.1" min={0} /></div>
            <div className="field"><label>Target margin post CM2 (%)</label><input type="number" value={form.cm2} onChange={(e) => set("cm2", e.target.value)} placeholder="40" step="0.5" min={0} max={100} /></div>
          </div>
        </div>

        {/* Context & priorities */}
        <div className="psec">
          <div className="section-label">Context &amp; priorities</div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Key objectives or context</label>
            <textarea value={form.context} onChange={(e) => set("context", e.target.value)} placeholder="e.g. State targeting NIPUN by 2026, PAB review in March…" />
          </div>
          <div className="field">
            <label>Key differentiators</label>
            <textarea value={form.differentiators} onChange={(e) => set("differentiators", e.target.value)} placeholder="e.g. Existing VSK deployment in HP, APAAR integration…" />
          </div>
        </div>

        {/* Sections to include */}
        <div className="psec">
          <div className="section-label-row">
            <div className="section-label">Sections to include</div>
            <div className="psec-actions">
              <button onClick={() => setSections(new Set<string>((generator?.sections as string[]) ?? []))}>All</button>
              <button onClick={() => setSections(new Set<string>())}>Clear</button>
            </div>
          </div>
          <div className="sections-list">
            {((generator?.sections as string[]) ?? []).map((s) => (
              <label key={s} className="section-check">
                <input type="checkbox" checked={sections.has(s)} onChange={(e) => toggleSection(s, e.target.checked)} />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Additional instructions */}
        <div className="psec">
          <div className="section-label">Additional instructions</div>
          <div className="field">
            <textarea value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} placeholder="e.g. Emphasise data-privacy compliance (DPDP Act, 2023) and prior state deployments." />
          </div>
        </div>

        {error && <div className="error-bar" style={{ marginTop: 12 }}><i className="ti ti-alert-circle" /><span>{error}</span></div>}

        <div className="gen-submit-row panel">
          <button className="btn btn-primary" disabled={busy} onClick={submit} style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "12px 28px" }}>
            <i className="ti ti-sparkles" /> {busy ? "Regenerating…" : "Regenerate"}
          </button>
          <div className="gen-submit-note">Regenerating rewrites the document on the right.</div>
        </div>
      </div>
    );
  }

  const glowMove = (e: { currentTarget: HTMLElement; clientX: number; clientY: number }) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div className="page-content">
      {/* Document type tabs */}
      <div className="generator-tabs">
        {GENERATORS.map((g) => (
          <button
            key={g.id}
            className={"gen-tab" + (g.id === generatorId ? " active" : "")}
            onClick={() => selectGenerator(g.id)}
          >
            <i className={"ti " + g.icon} /> {g.label}
          </button>
        ))}
      </div>

      {/* RFP response type — technical / financial / both */}
      {generatorId === "rfp_response" && (
        <div className="rfp-type-pick">
          <div className="rfp-type-q"><i className="ti ti-help-circle" /> Which RFP response do you want?</div>
          <div className="rfp-type-opts">
            {RFP_TYPE_OPTIONS.map((o) => (
              <button
                key={o.id}
                className={"rfp-type-btn" + (rfpType === o.id ? " active" : "")}
                onClick={() => setRfpType(o.id)}
                type="button"
              >
                <i className={"ti " + o.icon} />
                <span className="rfp-type-btn-label">{o.label}</span>
                <span className="rfp-type-btn-sub">{o.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RFP */}
      <div className="card glow-border" onMouseMove={glowMove}>
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
      <div className="card glow-border" onMouseMove={glowMove}>
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
      <div className="card glow-border" onMouseMove={glowMove}>
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
      <div className="card glow-border" onMouseMove={glowMove}>
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
      <div className="card glow-border" onMouseMove={glowMove}>
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
      <div className="card glow-border" onMouseMove={glowMove}>
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
      <div className="card glow-border" onMouseMove={glowMove}>
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

      {/* Sections to include — dynamic per document type */}
      <div className="card glow-border" onMouseMove={glowMove}>
        <div className="card-header" style={{ justifyContent: "space-between" }}>
          <div className="card-title"><i className="ti ti-list-check" /> Sections to include</div>
          <button className="btn btn-outline" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => setSections(new Set<string>((generator?.sections as string[]) ?? []))}>
            <i className="ti ti-sparkles" /> Decide for me
          </button>
        </div>
        <div className="sections-list">
          {((generator?.sections as string[]) ?? []).map((s) => (
            <label key={s} className="section-check">
              <input type="checkbox" checked={sections.has(s)} onChange={(e) => toggleSection(s, e.target.checked)} />
              <span>{s}</span>
            </label>
          ))}
        </div>
        <div className="card-divider" />
        <div className="field">
          <label><i className="ti ti-message-2" /> Additional instructions</label>
          <textarea value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} placeholder="e.g. Emphasise data-privacy compliance (DPDP Act, 2023) and prior state deployments." />
        </div>
      </div>

      <div className="gen-submit-row" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
        <button className="btn btn-primary" disabled={busy} onClick={submit} style={{ fontSize: 14, padding: "12px 28px" }}>
          <i className="ti ti-sparkles" /> {busy ? "Generating…" : `Generate ${generator?.label?.replace(/^Generate /, "") || "proposal"}`}
        </button>
        <span style={{ fontSize: 12, color: "var(--text-hint)" }}><span className="req">*</span> required fields</span>
      </div>

      {error && <div className="error-bar"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
    </div>
  );
}
