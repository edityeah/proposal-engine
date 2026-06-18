interface RetrievedDoc {
  kind: string;
  title: string;
  state: string | null;
  excerpt: string;
}

const KIND_LABEL: Record<string, string> = {
  winning_proposal: "Past winning proposal",
  rfp: "Past RFP",
  sop: "Internal SOP",
  exhibit: "Exhibit",
  toc: "Theory of change",
};

// Formats retrieved knowledge as a grounding block. Treated as reference
// material — the model should reuse proven framing/numbers, not copy verbatim.
export function buildRetrievalBlock(docs: RetrievedDoc[]): string {
  if (!docs.length) return "";
  const items = docs
    .map((d, i) => {
      const label = KIND_LABEL[d.kind] || d.kind;
      const where = d.state ? ` (${d.state})` : "";
      return `[${i + 1}] ${label}${where} — ${d.title}\n${d.excerpt}`;
    })
    .join("\n\n");
  return (
    "\n\n═══ RELEVANT PAST MATERIAL (REFERENCE — reuse proven framing, data points, and structure; adapt, do not copy verbatim) ═══\n" +
    items +
    "\n═══ END REFERENCE MATERIAL ═══"
  );
}

interface CurationItem {
  kind: string;
  title: string;
  content: string;
}

const CURATION_GROUPS: { key: string; heading: string }[] = [
  { key: "best_practice", heading: "BEST PRACTICES & NORMS — follow these" },
  { key: "proof_point", heading: "APPROVED PROOF POINTS & FACTS — use these exact figures where relevant" },
  { key: "boilerplate", heading: "APPROVED BOILERPLATE — adapt these standard sections" },
];

// Curated, admin-maintained guidance. This is authoritative (unlike retrieved
// past material), so it's framed as instructions/approved content to apply.
export function buildCurationBlock(entries: CurationItem[]): string {
  if (!entries.length) return "";
  let out = "\n\n═══ CURATED GUIDANCE (maintained by the team — authoritative) ═══";
  for (const g of CURATION_GROUPS) {
    const group = entries.filter((e) => e.kind === g.key);
    if (!group.length) continue;
    out += `\n\n## ${g.heading}\n` + group.map((e) => `• ${e.title}: ${e.content}`).join("\n");
  }
  out += "\n═══ END CURATED GUIDANCE ═══";
  return out;
}
