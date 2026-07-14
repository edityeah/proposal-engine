import { GENERATORS } from "@/data/generators";
import { PRODUCTS, INDIVIDUAL_MODULES } from "@/data/products";
import { buildUserPrompt, type GenerateInputs } from "@/lib/prompt";
import { streamProposal } from "@/lib/anthropic";
import { getOverride, retrieveContext } from "@/lib/db/knowledge";
import { curationForGeneration } from "@/lib/db/curation";
import { buildRetrievalBlock, buildCurationBlock } from "@/lib/retrieval";
import { createProposal, finalizeProposalOutput } from "@/lib/db/queries";

export type Provider = "anthropic" | "openai" | "gemini";
export interface ChatModel {
  id: string;
  label: string;        // short model name shown on the picker trigger
  hint: string;         // human, task-oriented one-liner shown in the menu
  provider: Provider;
}

// `hint` is written for a pre-sales user, not a benchmark — it says what each
// model is *good at here* (drafting an RFP response, a quick answer, deep
// reasoning), not its spec sheet.
export const CHAT_MODELS: ChatModel[] = [
  // Claude
  { id: "claude-fable-5", label: "Claude Fable 5", hint: "Deepest reasoning — complex, multi-part proposals", provider: "anthropic" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", hint: "Best for full RFP responses & detailed proposals", provider: "anthropic" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", hint: "Balanced — quick drafts, edits & follow-ups", provider: "anthropic" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", hint: "Fastest — short answers & quick summaries", provider: "anthropic" },
  // OpenAI
  { id: "gpt-5.5", label: "GPT-5.5", hint: "OpenAI's best — strong long-form writing", provider: "openai" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini", hint: "Fast — everyday drafting & Q&A", provider: "openai" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 nano", hint: "Fastest — quick, simple replies", provider: "openai" },
  { id: "gpt-4.1", label: "GPT-4.1", hint: "Reliable all-round writing", provider: "openai" },
  { id: "gpt-4o", label: "GPT-4o", hint: "Fast, capable general model", provider: "openai" },
  { id: "o3", label: "o3", hint: "Step-by-step reasoning for tricky asks", provider: "openai" },
  { id: "o3-mini", label: "o3-mini", hint: "Lightweight reasoning, faster", provider: "openai" },
  // Gemini (Google) — via the OpenAI-compatible API. Text-only for now (no web
  // search / doc-generation tool wiring yet).
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Google's most capable (text only here)", provider: "gemini" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Fast Google model (text only)", provider: "gemini" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", hint: "Fastest Google model (text only)", provider: "gemini" },
];
export const DEFAULT_CHAT_MODEL = "claude-opus-4-8";
export function isValidChatModel(m: string): boolean {
  return CHAT_MODELS.some((x) => x.id === m);
}
export function providerFor(m: string): Provider {
  return CHAT_MODELS.find((x) => x.id === m)?.provider ?? "anthropic";
}
export function chatModelLabel(m: string): string {
  return CHAT_MODELS.find((x) => x.id === m)?.label ?? m;
}

// ── Auto mode ────────────────────────────────────────────────────────────────
// When the user opts into "Auto", the engine picks a model per message so simple
// turns don't burn top-tier credits and heavy drafting still gets the best model.
// We route WITHIN one provider family (the one that will actually answer): OpenAI
// in demo mode, Anthropic otherwise — never across families, so a routed model is
// always reachable with the configured key.
type Tier = "heavy" | "balanced" | "light";
const AUTO_TIERS: Record<Provider, Record<Tier, string>> = {
  anthropic: { heavy: "claude-opus-4-8", balanced: "claude-sonnet-4-6", light: "claude-haiku-4-5" },
  openai:    { heavy: "gpt-5.5",         balanced: "gpt-5.4-mini",       light: "gpt-5.4-nano" },
  gemini:    { heavy: "gemini-2.5-pro",  balanced: "gemini-2.5-flash",   light: "gemini-2.0-flash" },
};

// Heuristic router — no extra LLM call (that would add the very latency/cost
// Auto is meant to save). Classifies the latest user turn by intent + length.
function classifyTier(text: string, hasAttachment: boolean): Tier {
  const t = text.toLowerCase().trim();
  // Drafting / costing / tender work → the heavy model, every time.
  const heavy = /\b(proposal|rfp|rft|eoi|tender|pab|concept note|executive summary|cm2|costing|budget|draft|generate|write (?:me |a |an |the )?(?:document|note|proposal|response|letter)|full (?:document|proposal))\b/;
  // Greetings / acks / very short asks → the light model.
  const light = /^(hi|hello|hey|thanks|thank you|thx|ok|okay|yes|no|sure|cool|got it|nice|great)\b[.! ]*$/;
  if (hasAttachment) return "heavy";                 // reading a doc → give it the best
  if (heavy.test(t) || text.length > 600) return "heavy";
  if (light.test(t) || text.length < 60) return "light";
  return "balanced";
}

// Returns the concrete model id Auto picks for this turn, plus the tier (for UI).
export function pickAutoModel(
  text: string,
  hasAttachment: boolean,
): { model: string; tier: Tier } {
  const tier = classifyTier(text, hasAttachment);
  return { model: AUTO_TIERS.anthropic[tier], tier };
}

// Compact catalogue so the model knows valid productId / generatorId values.
function catalog(): string {
  const gens = GENERATORS.map((g) => `- ${g.id}: ${g.label}`).join("\n");
  const vsk = PRODUCTS.filter((p) => p.type === "vsk").map((p) => `- ${p.id} (vsk): ${p.name} — ${p.tagline}`).join("\n");
  const vai = PRODUCTS.filter((p) => p.type === "vai").map((p) => `- ${p.id} (vai): ${p.name}`).join("\n");
  const mods = INDIVIDUAL_MODULES.slice(0, 40).map((m) => `- ${m.id} (module): ${m.name}`).join("\n");
  return `DOCUMENT TYPES (generatorId):\n${gens}\n\nVSK PRODUCTS (productId, proposalType="vsk"):\n${vsk}\n\nVAI PACKAGES (productId, proposalType="vai"):\n${vai}\n\nSINGLE MODULES (productId, proposalType="module"):\n${mods}`;
}

export function chatSystemPrompt(): string {
  return [
    "You are the ConveGenius (CG) Pre-Sales research assistant. CG is an Indian edtech company building AI-powered Swiftverse platforms (VSK, VAI, NIPUN Bot, etc.) for government school education.",
    "",
    "Your job is to help the pre-sales team hunt and qualify opportunities in the Indian government school-education ecosystem — tenders, RFPs, EOIs, PAB/Samagra Shiksha funding lines, state budgets, NEP/NIPUN-aligned programmes, and competitor moves — and to do secondary research.",
    "",
    "Use the web_search tool whenever current information would change the answer (live tenders, recent budgets, news, version-specific facts). Cite sources with links. Be concise and action-oriented; lead with the answer, then supporting detail.",
    "",
    "When the user wants an actual document drafted (proposal, PAB note, RFP response, concept note, executive summary, CM2 analysis), call the generate_document tool with the right generatorId, productId and project details inferred from the conversation. After it runs, tell the user it's ready and that they can open it in the proposal editor. Don't paste the whole document into chat — the tool saves it.",
    "",
    "RFP RESPONSE TYPE: An RFP response is always one of two bids — a Technical bid or a Financial (commercial) bid — or both. Before you call generate_document with generatorId=rfp_response, you MUST know which one the user wants. If they haven't said, ask 'Which RFP response do you want?' and end that message with exactly: [[suggest: Technical | Financial | Both]] — do not call the tool until they answer. Then pass the answer as the rfpType argument (technical | financial | both).",
    "",
    "QUICK REPLIES: Whenever you ask the user to choose between distinct options, end your message with a suggestions block on its very last line, exactly in this form: [[suggest: Option one | Option two | Option three]]. Give 2–5 options, each a short tappable label of at most 6 words (e.g. \"Draft a document\", \"Research an opportunity\"). Do NOT add an \"Other\" choice — the interface adds one automatically. Put nothing after the block. Only include it when you are genuinely offering the user a choice.",
    "",
    catalog(),
  ].join("\n");
}

export const GENERATE_DOC_TOOL = {
  name: "generate_document",
  description:
    "Generate and save a ConveGenius pre-sales document (proposal, PAB note, RFP response, concept note, executive summary, or CM2 analysis) using the structured generation pipeline. Returns a proposalId the user can open in the editor.",
  input_schema: {
    type: "object" as const,
    properties: {
      generatorId: { type: "string", description: "Document type id from the catalogue (e.g. proposal, rfp_response, pab_note, concept_note, executive_summary, cm2_analysis)" },
      proposalType: { type: "string", enum: ["vsk", "vai", "module"], description: "Which kind of product" },
      productId: { type: "string", description: "Product id from the catalogue" },
      moduleNames: { type: "array", items: { type: "string" }, description: "For vsk: the module names to include" },
      state: { type: "string" },
      department: { type: "string" },
      schools: { type: "string" },
      students: { type: "string" },
      teachers: { type: "string" },
      grades: { type: "string" },
      duration: { type: "string" },
      budget: { type: "string" },
      cm2: { type: "string" },
      org: { type: "string", description: "direct | tcil | railtel | nic | other" },
      context: { type: "string" },
      differentiators: { type: "string" },
      rfpType: { type: "string", enum: ["technical", "financial", "both"], description: "For rfp_response ONLY: which bid to draft — technical, financial, or both. Ask the user first if unclear." },
    },
    required: ["generatorId", "productId", "state", "department"],
  },
};

type ToolInput = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

// RFP responses split into a technical bid and a financial/commercial bid.
const RFP_TYPE_NOTE: Record<string, string> = {
  technical:
    "SCOPE OF THIS RESPONSE: Produce ONLY the TECHNICAL bid — understanding, solution architecture, approach & timeline, team, past experience, SLAs, risk. Do NOT include commercial pricing, the priced Bill of Quantities, or the financial bid.",
  financial:
    "SCOPE OF THIS RESPONSE: Produce ONLY the FINANCIAL / commercial bid — the priced Bill of Quantities, a cost break-up mapped to each scope item and PAB / budget head (component → physical units → unit cost → total → amount in ₹ lakhs, tagged R/NR), payment milestones, taxes, and commercial terms. Keep technical narrative to a brief one-paragraph context. Never fabricate a rate — use a clearly-marked [INSERT: …] placeholder for any unknown unit cost.",
  both:
    "SCOPE OF THIS RESPONSE: Produce BOTH bids in ONE document, clearly separated — 'Part A — Technical Bid' (the full technical response) then 'Part B — Financial Bid' (priced Bill of Quantities, cost break-up mapped to scope items and PAB / budget heads, payment schedule, taxes, commercial terms). Never fabricate a rate — use a clearly-marked [INSERT: …] placeholder for any unknown unit cost.",
};

// Executes the generate_document tool: assembles the prompt (product system
// prompt + overrides + RAG + curation), drafts via the model, saves a proposal.
export async function runGenerateDocument(
  input: ToolInput,
  userId: string,
): Promise<{ proposalId: string; title: string; words: number } | { error: string }> {
  const generator = GENERATORS.find((g) => g.id === input.generatorId);
  if (!generator) return { error: `Unknown generatorId "${str(input.generatorId)}".` };

  const productId = str(input.productId);
  let product = PRODUCTS.find((p) => p.id === productId);
  let productName = product?.name || "";
  let systemPrompt = product?.systemPrompt || "";
  let proposalType = str(input.proposalType) || product?.type || "vsk";

  if (!product) {
    const mod = INDIVIDUAL_MODULES.find((m) => m.id === productId);
    if (mod) {
      productName = mod.name;
      proposalType = "module";
      const parent = PRODUCTS.find((p) => p.name === mod.package) || PRODUCTS.find((p) => p.type === "vsk");
      systemPrompt = parent?.systemPrompt || "";
    }
  }
  if (!systemPrompt) return { error: `Unknown productId "${productId}".` };

  const inputs: GenerateInputs = {
    productId,
    productName,
    productTagline: product?.tagline || "",
    productObjective: product?.objective || "",
    systemPrompt,
    generatorLabel:
      generator.id === "rfp_response" && RFP_TYPE_NOTE[str(input.rfpType)]
        ? `${generator.label} · ${str(input.rfpType) === "both" ? "Technical + Financial" : str(input.rfpType) === "financial" ? "Financial" : "Technical"}`
        : generator.label,
    generatorPrefix:
      generator.id === "rfp_response" && RFP_TYPE_NOTE[str(input.rfpType)]
        ? `${generator.promptPrefix}\n\n${RFP_TYPE_NOTE[str(input.rfpType)]}`
        : generator.promptPrefix,
    proposalType: proposalType as "vsk" | "vai" | "module",
    selectedModuleNames: Array.isArray(input.moduleNames) ? (input.moduleNames as string[]) : [],
    selectedSurroundNames: [],
    singleModuleName: proposalType === "module" ? productName : null,
    state: str(input.state),
    department: str(input.department),
    submissionType: generator.id === "rfp_response" ? "Response to RFP" : "Unsolicited proposal",
    schools: str(input.schools),
    grades: str(input.grades),
    students: str(input.students),
    teachers: str(input.teachers),
    duration: str(input.duration),
    implementingPartner: "",
    budget: str(input.budget),
    cm2: str(input.cm2),
    context: str(input.context),
    differentiators: str(input.differentiators),
    org: str(input.org) || "direct",
    psuContext: "",
    rfpLoaded: false,
    rfpText: "",
  };

  // System prompt override + augmentation (RAG + curation).
  const override = await getOverride("product", productId).catch(() => null);
  const genOverride = await getOverride("generator", generator.id).catch(() => null);
  if (genOverride) inputs.generatorPrefix = genOverride;
  const system = override || systemPrompt;

  let userPrompt = buildUserPrompt(inputs);
  try {
    const ctx = await retrieveContext({
      state: inputs.state,
      keywords: [inputs.department, productName, ...(inputs.selectedModuleNames ?? [])].filter(Boolean) as string[],
    });
    userPrompt += buildRetrievalBlock(ctx);
  } catch {}
  try {
    const entries = await curationForGeneration({ generatorId: generator.id, productId, state: inputs.state });
    userPrompt += buildCurationBlock(entries);
  } catch {}

  const title = `${generator.label} — ${productName} · ${inputs.state}`;
  const proposal = await createProposal({
    userId,
    title,
    productId,
    productName,
    generatorId: generator.id,
    generatorLabel: generator.label,
    proposalType: inputs.proposalType,
    state: inputs.state,
    org: inputs.org,
    inputs: inputs as unknown as Record<string, unknown>,
    output: "",
    model: "claude-opus-4-8",
    status: "draft",
  });

  let full = "";
  try {
    full = await streamProposal({ system, user: userPrompt, onText: () => {} });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Generation failed" };
  }
  await finalizeProposalOutput(proposal.id, full);
  return { proposalId: proposal.id, title, words: full.split(/\s+/).length };
}
