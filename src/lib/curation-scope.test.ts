import { describe, it, expect } from "vitest";
import { matchesScope } from "./db/curation";

describe("curation matchesScope", () => {
  it("empty scope applies everywhere", () => {
    expect(matchesScope({ docTypes: [], products: [], state: null }, { generatorId: "proposal", productId: "vsk1", state: "Bihar" })).toBe(true);
  });
  it("filters by document type", () => {
    const e = { docTypes: ["rfp_response"], products: [], state: null };
    expect(matchesScope(e, { generatorId: "rfp_response" })).toBe(true);
    expect(matchesScope(e, { generatorId: "proposal" })).toBe(false);
  });
  it("filters by product", () => {
    const e = { docTypes: [], products: ["vsk2"], state: null };
    expect(matchesScope(e, { productId: "vsk2" })).toBe(true);
    expect(matchesScope(e, { productId: "vsk1" })).toBe(false);
  });
  it("filters by state", () => {
    const e = { docTypes: [], products: [], state: "Rajasthan" };
    expect(matchesScope(e, { state: "Rajasthan" })).toBe(true);
    expect(matchesScope(e, { state: "Bihar" })).toBe(false);
  });
  it("combines filters (all must pass)", () => {
    const e = { docTypes: ["proposal"], products: ["vsk1"], state: "Bihar" };
    expect(matchesScope(e, { generatorId: "proposal", productId: "vsk1", state: "Bihar" })).toBe(true);
    expect(matchesScope(e, { generatorId: "proposal", productId: "vsk2", state: "Bihar" })).toBe(false);
  });
});
