import { describe, it, expect } from "vitest";
import { computeCm2 } from "./costing";

describe("computeCm2", () => {
  it("uses the given budget as revenue", () => {
    const r = computeCm2({ budgetCr: 100 });
    expect(r.revenueCr).toBe(100);
    expect(r.estimatedRevenue).toBe(false);
  });

  it("CM2 < CM1 < revenue, and percentages are consistent", () => {
    const r = computeCm2({ budgetCr: 100 });
    expect(r.cm1Cr).toBeGreaterThan(r.cm2Cr);
    expect(r.revenueCr).toBeGreaterThan(r.cm1Cr);
    expect(r.cm2Pct).toBeCloseTo((r.cm2Cr / r.revenueCr) * 100, 1);
  });

  it("partner routing lowers CM2", () => {
    const direct = computeCm2({ budgetCr: 100, viaPartner: false });
    const viaPsu = computeCm2({ budgetCr: 100, viaPartner: true });
    expect(viaPsu.cm2Cr).toBeLessThan(direct.cm2Cr);
    expect(viaPsu.partnerOverheadCr).toBeGreaterThan(0);
  });

  it("estimates revenue from schools when no budget given", () => {
    const r = computeCm2({ schools: 15000, durationYears: 2 });
    expect(r.estimatedRevenue).toBe(true);
    expect(r.revenueCr).toBeGreaterThan(0);
  });

  it("returns zeros with no usable inputs", () => {
    const r = computeCm2({});
    expect(r.revenueCr).toBe(0);
    expect(r.cm2Cr).toBe(0);
  });
});
