// CM2 margin auto-calculation. A transparent, percentage-based model so the
// finance memo ("CM2 margin analysis" generator) and the form can show an
// estimate from budget + scale instead of leaving it blank.

export interface CostLine {
  label: string;
  pct: number; // share of revenue
}

// Default cost structure (share of revenue). Tunable; surfaced in the Costing view.
export const DEFAULT_COST_TEMPLATE: CostLine[] = [
  { label: "Manpower (PM, implementation, support)", pct: 0.28 },
  { label: "Technology licensing & platform", pct: 0.14 },
  { label: "Content & assessment", pct: 0.08 },
  { label: "Cloud / infrastructure", pct: 0.06 },
  { label: "Print & delivery", pct: 0.05 },
  { label: "Travel & field", pct: 0.05 },
  { label: "Contingency", pct: 0.03 },
];

// Indirect overheads applied after CM1 to reach CM2.
export const OVERHEAD_PCT = 0.09;
// Additional pass-through overhead when routed via a CPSU/implementing partner.
export const PSU_OVERHEAD_PCT = 0.06;

export interface Cm2Input {
  budgetCr?: number; // total contract value ceiling, ₹ Cr
  schools?: number;
  students?: number;
  durationYears?: number;
  viaPartner?: boolean; // routed through TCIL/RailTel/NIC/CPSU
}

export interface Cm2Result {
  revenueCr: number;
  directCostCr: number;
  cm1Cr: number;
  cm1Pct: number;
  overheadCr: number;
  partnerOverheadCr: number;
  cm2Cr: number;
  cm2Pct: number;
  estimatedRevenue: boolean; // true if revenue was inferred (no budget given)
  lines: { label: string; amountCr: number }[];
}

// If no budget is provided, infer a rough revenue from scale.
function inferRevenueCr(i: Cm2Input): number {
  const years = i.durationYears && i.durationYears > 0 ? i.durationYears : 1;
  // Heuristic unit economics (₹): ~₹25k/school/yr OR ~₹120/student/yr, whichever is present.
  if (i.schools && i.schools > 0) return (i.schools * 25000 * years) / 1e7;
  if (i.students && i.students > 0) return (i.students * 120 * years) / 1e7;
  return 0;
}

export function computeCm2(i: Cm2Input): Cm2Result {
  const estimatedRevenue = !i.budgetCr || i.budgetCr <= 0;
  const revenueCr = estimatedRevenue ? inferRevenueCr(i) : (i.budgetCr as number);

  const lines = DEFAULT_COST_TEMPLATE.map((l) => ({
    label: l.label,
    amountCr: round(revenueCr * l.pct),
  }));
  const partnerOverheadCr = i.viaPartner ? round(revenueCr * PSU_OVERHEAD_PCT) : 0;
  if (i.viaPartner) lines.push({ label: "CPSU / partner overhead", amountCr: partnerOverheadCr });

  const directCostCr = round(lines.reduce((s, l) => s + l.amountCr, 0));
  const cm1Cr = round(revenueCr - directCostCr);
  const overheadCr = round(revenueCr * OVERHEAD_PCT);
  const cm2Cr = round(cm1Cr - overheadCr);

  return {
    revenueCr: round(revenueCr),
    directCostCr,
    cm1Cr,
    cm1Pct: pct(cm1Cr, revenueCr),
    overheadCr,
    partnerOverheadCr,
    cm2Cr,
    cm2Pct: pct(cm2Cr, revenueCr),
    estimatedRevenue,
    lines,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}
