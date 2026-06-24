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
export interface ModuleDef {
  id: ModuleId;
  name: string;
  icon: string;
  tagline: string;
  blurb: string; // shown on the landing card
  accent: string; // CSS colour for the card/sidebar accent
  defaultScreen: Screen;
  adminOnly?: boolean;
  groups: NavGroup[];
}

export const MODULES: ModuleDef[] = [
  {
    id: "proposal",
    name: "Proposal Engine",
    icon: "ti-file-text",
    tagline: "Win more government school deals",
    blurb: "Draft proposals, PAB notes and RFP responses, track win/loss, and research opportunities.",
    accent: "#386AF6",
    defaultScreen: "generate",
    groups: [
      {
        label: "Create",
        items: [
          { id: "generate", icon: "ti-sparkles", name: "Generate doc" },
          { id: "history", icon: "ti-clock-history", name: "History" },
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
    accent: "#00BA34",
    defaultScreen: "marketing",
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
    blurb: "Curate guidance, edit product prompts, manage costing templates and team access.",
    accent: "#7A7AB8",
    defaultScreen: "curation",
    adminOnly: true,
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
