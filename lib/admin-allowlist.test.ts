import { describe, it, expect } from "vitest";
import { isAdminEmail, ADMIN_EMAILS } from "./admin-allowlist";

/**
 * This function is the gate on View As (lib/account/view-as.ts) and on the
 * internal-tools screensaver (middleware.ts). Anything it wrongly returns true
 * for gets to read other members' accounts, so the near-miss cases are worth
 * pinning down.
 */
describe("isAdminEmail", () => {
  it("accepts the allowlisted address", () => {
    expect(isAdminEmail(ADMIN_EMAILS[0])).toBe(true);
  });

  it("is case- and whitespace-insensitive, as real session emails vary", () => {
    expect(isAdminEmail("  LaMont703@Gmail.com  ")).toBe(true);
  });

  it("rejects absent emails rather than treating them as a match", () => {
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });

  it("rejects look-alike addresses on other domains", () => {
    for (const near of [
      "lamont703@gmail.com.evil.com",
      "lamont703@gmail.co",
      "lamont703@notgmail.com",
      "xlamont703@gmail.com",
      "lamont703+admin@gmail.com",
      "lamont7030@gmail.com",
    ]) {
      expect(isAdminEmail(near), near).toBe(false);
    }
  });

  it("requires a full match, not a substring", () => {
    expect(isAdminEmail("attacker@evil.com,lamont703@gmail.com")).toBe(false);
  });
});
