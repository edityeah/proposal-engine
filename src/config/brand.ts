// ─────────────────────────────────────────────────────────────
// Brand grammar — the locked layer for generated marketing assets.
// Sourced from CG's brand-kit briefs (Google Drive). SwiftChat is confirmed;
// ConveGenius values are INDICATIVE (per the brief) — flagged provisional until
// the master files are locked. Logo files are added once provided.
// ─────────────────────────────────────────────────────────────

export interface BrandColor {
  hex: string;
  name: string;
}

export interface Brand {
  id: "swiftchat" | "convegenius";
  name: string;
  provisional: boolean; // true = values indicative, pending lock
  colors: {
    primary: BrandColor;
    secondary: BrandColor;
    ink: BrandColor; // dark text / backgrounds
    accents: BrandColor[];
    paper: string; // light background
  };
  fonts: {
    heading: string; // Google Font family name
    body: string;
    googleFontsUrl: string; // for HTML/image rendering
  };
  tagline: string;
  tone: string;
  stats: string[];
  // Relative path under /public once logo files are supplied.
  logo?: { full?: string; reversed?: string; mark?: string };
}

export const BRANDS: Record<Brand["id"], Brand> = {
  swiftchat: {
    id: "swiftchat",
    name: "SwiftChat",
    provisional: false,
    colors: {
      primary: { hex: "#00BA34", name: "Logo Green" },
      secondary: { hex: "#386AF6", name: "Brand Blue" },
      ink: { hex: "#0E1B2B", name: "Ink" },
      accents: [
        { hex: "#386AF6", name: "Brand Blue" },
        { hex: "#00BA34", name: "Logo Green" },
      ],
      paper: "#FFFFFF",
    },
    fonts: {
      heading: "Ubuntu",
      body: "Nunito",
      googleFontsUrl:
        "https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&family=Nunito:wght@400;600;700&display=swap",
    },
    tagline: "Changing the way Bharat learns",
    tone: "Warm, encouraging, plain-language, optimistic. Never corporate or jargon-heavy.",
    stats: ["150M+ users", "15+ Indian states", "Best AI App · Google Play 2023"],
    logo: { full: "/brand/swiftchat-full.png", mark: "/brand/swiftchat-mark.png" },
  },
  convegenius: {
    id: "convegenius",
    name: "ConveGenius",
    provisional: true,
    colors: {
      primary: { hex: "#1F5FD0", name: "ConveGenius Blue (indicative)" },
      secondary: { hex: "#0E2A57", name: "Deep Navy Ink (indicative)" },
      ink: { hex: "#0E2A57", name: "Deep Navy Ink" },
      accents: [
        { hex: "#2E8FE6", name: "Sky" },
        { hex: "#12A4A4", name: "Teal" },
        { hex: "#F5A623", name: "Amber" },
      ],
      paper: "#FFFFFF",
    },
    fonts: {
      // Not yet chosen in the brief — sensible open-license placeholder.
      heading: "Inter",
      body: "Inter",
      googleFontsUrl:
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    },
    tagline: "Empowering Education in India",
    tone: "Visionary yet grounded; authoritative, credible, evidence-led; infrastructure-oriented.",
    stats: [
      "Founded 2013",
      "22+ Indian states",
      "UChicago / Prof. Kremer: ~1.9 yrs learning in 17 months",
    ],
    logo: { full: "/brand/convegenius-full.png" },
  },
};

export const BRAND_LIST = Object.values(BRANDS);
