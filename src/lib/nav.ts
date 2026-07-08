import type { ModuleId, Screen } from "./types";

// ─────────────────────────────────────────────────────────────
// Two-level navigation: the user first picks a module (Proposal /
// Marketing / Admin), then the sidebar shows only that module's screens.
// ─────────────────────────────────────────────────────────────

export interface NavItem {
  id: Screen;
  icon: string;
  name: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}
// A "jump straight to a tool" shortcut shown as a chip on the landing card.
// `screen` is the screen to open; `generatorId` (proposal only) preselects a
// document generator inside the Generate form.
export interface QuickLaunch {
  label: string;
  screen: Screen;
  generatorId?: string;
}
export interface ModuleDef {
  id: ModuleId;
  name: string;
  icon: string;
  tagline: string;
  blurb: string; // shown on the landing card
  accent: string; // CSS colour for the card/sidebar accent
  defaultScreen: Screen;
  adminOnly?: boolean;
  quickLaunch: QuickLaunch[]; // landing-card shortcuts ("jump straight to a tool")
  groups: NavGroup[];
}

export const MODULES: ModuleDef[] = [
  {
    id: "proposal",
    name: "Proposal Engine",
    icon: "ti-file-text",
    tagline: "Win more government school deals",
    blurb: "Draft proposals, PAB notes and RFP responses, model CM2 margins, and research live opportunities.",
    accent: "#386AF6",
    defaultScreen: "generate",
    quickLaunch: [
      { label: "Generate proposal", screen: "generate", generatorId: "proposal" },
      { label: "PAB proposal note", screen: "generate", generatorId: "pab_note" },
      { label: "RFP response", screen: "generate", generatorId: "rfp_response" },
      { label: "CM2 margin analysis", screen: "generate", generatorId: "cm2_analysis" },
      { label: "Executive summary", screen: "generate", generatorId: "executive_summary" },
      { label: "Concept note", screen: "generate", generatorId: "concept_note" },
    ],
    groups: [
      {
        label: "Create",
        items: [
          { id: "generate", icon: "ti-sparkles", name: "Generate doc" },
          { id: "history", icon: "ti-history", name: "History" },
          { id: "analytics", icon: "ti-chart-pie", name: "Win/loss analytics" },
        ],
      },
      {
        label: "Intelligence",
        items: [
          { id: "chat", icon: "ti-message-chatbot", name: "Research chat" },
          { id: "knowledge", icon: "ti-brain", name: "Knowledge base" },
          { id: "rfplibrary", icon: "ti-file-search", name: "RFP library" },
        ],
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing Engine",
    icon: "ti-palette",
    tagline: "On-brand collateral, in-house",
    blurb: "Generate finished, brand-styled decks, images, carousels and campaigns from CG's brand grammar.",
    accent: "#2E8B82",
    defaultScreen: "marketing",
    quickLaunch: [{ label: "Brand collateral studio", screen: "marketing" }],
    groups: [
      {
        label: "Studio",
        items: [{ id: "marketing", icon: "ti-palette", name: "Marketing studio" }],
      },
    ],
  },
  {
    id: "admin",
    name: "Admin",
    icon: "ti-settings",
    tagline: "Configure the engine",
    blurb: "Curate reference guidance, edit product prompts, manage costing templates and team access.",
    accent: "#4F46C4",
    defaultScreen: "curation",
    adminOnly: true,
    quickLaunch: [
      { label: "Guidance library", screen: "curation" },
      { label: "Product prompts", screen: "products" },
      { label: "Costing templates", screen: "costing" },
      { label: "Team & access", screen: "team" },
    ],
    groups: [
      {
        label: "Knowledge & content",
        items: [
          { id: "curation", icon: "ti-books", name: "Curation studio" },
          { id: "products", icon: "ti-adjustments-horizontal", name: "Products & prompts" },
        ],
      },
      {
        label: "Settings",
        items: [
          { id: "costing", icon: "ti-calculator", name: "Costing templates" },
          { id: "team", icon: "ti-users-group", name: "Team access" },
        ],
      },
    ],
  },
];

export function getModule(id: ModuleId): ModuleDef {
  return MODULES.find((m) => m.id === id) ?? MODULES[0];
}

// Which module a screen belongs to (used to resolve deep-links / output view).
export function moduleForScreen(screen: Screen): ModuleId {
  if (screen === "output") return "proposal";
  for (const m of MODULES) {
    for (const g of m.groups) {
      if (g.items.some((it) => it.id === screen)) return m.id;
    }
  }
  return "proposal";
}
