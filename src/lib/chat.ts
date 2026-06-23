import { GENERATORS } from "@/data/generators";
import { PRODUCTS, INDIVIDUAL_MODULES } from "@/data/products";
import { buildUserPrompt, type GenerateInputs } from "@/lib/prompt";
import { streamProposal } from "@/lib/anthropic";
import { getOverride, retrieveContext } from "@/lib/db/knowledge";
import { curationForGeneration } from "@/lib/db/curation";
import { buildRetrievalBlock, buildCurationBlock } from "@/lib/retrieval";
import { createProposal, finalizeProposalOutput } from "@/lib/db/queries";

export type Provider = "anthropic" | "openai";
export interface ChatModel {
  id: string;
  label: string;
  provider: Provider;
}

export const CHAT_MODELS: ChatModel[] = [
  // Claude
  { id: "claude-fable-5", label: "Claude Fable 5 · most capable", provider: "anthropic" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 · best quality", provider: "anthropic" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 · fast & balanced", provider: "anthropic" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 · fastest", provider: "anthropic" },
  // OpenAI
  { id: "gpt-5.5", label: "GPT-5.5 · best (OpenAI)", provider: "openai" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 mini · fast (OpenAI)", provider: "openai" },
  { id: "gpt-5.4-nano", label: "GPT-5.4 nano · fastest (OpenAI)", provider: "openai" },
  { id: "gpt-4.1", label: "GPT-4.1 (OpenAI)", provider: "openai" },
  { id: "gpt-4o", label: "GPT-4o (OpenAI)", provider: "openai" },
  { id: "o3", label: "o3 · reasoning (OpenAI)", provider: "openai" },
  { id: "o3-mini", label: "o3-mini · reasoning (OpenAI)", provider: "openai" },
];
export const DEFAULT_CHAT_MODEL = "claude-opus-4-8";
export function isValidChatModel(m: string): boolean {
  return CHAT_MODELS.some((x) => x.id === m);
}
export function providerFor(m: string): Provider {
  return CHAT_MODELS.find((x) => x.id === m)?.provider ?? "anthropic";
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
    },
    required: ["generatorId", "productId", "state", "department"],
  },
};

type ToolInput = Record<string, unknown>;
const str = (v: unknown) => (v == null ? "" : String(v));

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
    generatorLabel: generator.label,
    generatorPrefix: generator.promptPrefix,
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
