import { describe, it, expect } from "vitest";
import { isAllowedEmail, isAdminEmail, roleFor } from "./access";

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

describe("admin role", () => {
  it("recognises the two seeded admins (case-insensitive)", () => {
    expect(isAdminEmail("devasheesh@convegenius.ai")).toBe(true);
    expect(isAdminEmail("Aditya.C@ConveGenius.ai")).toBe(true);
    expect(roleFor("devasheesh@convegenius.ai")).toBe("admin");
  });
  it("treats other org members as members", () => {
    expect(isAdminEmail("someone.else@convegenius.ai")).toBe(false);
    expect(roleFor("someone.else@convegenius.ai")).toBe("member");
  });
  it("rejects empty", () => {
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });
});
