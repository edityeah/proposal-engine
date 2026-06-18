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
