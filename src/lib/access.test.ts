import { describe, it, expect } from "vitest";
import { isAllowedEmail } from "./access";

describe("isAllowedEmail", () => {
  const domain = "convegenius.ai";

  it("allows org emails", () => {
    expect(isAllowedEmail("aditya.c@convegenius.ai", domain)).toBe(true);
  });

  it("is case-insensitive and trims", () => {
    expect(isAllowedEmail("  Aditya.C@ConveGenius.AI ", domain)).toBe(true);
  });

  it("rejects other domains", () => {
    expect(isAllowedEmail("someone@gmail.com", domain)).toBe(false);
  });

  it("rejects look-alike domains", () => {
    expect(isAllowedEmail("attacker@notconvegenius.ai", domain)).toBe(false);
    expect(isAllowedEmail("x@convegenius.ai.evil.com", domain)).toBe(false);
  });

  it("rejects empty / null", () => {
    expect(isAllowedEmail("", domain)).toBe(false);
    expect(isAllowedEmail(null, domain)).toBe(false);
    expect(isAllowedEmail(undefined, domain)).toBe(false);
  });
});
