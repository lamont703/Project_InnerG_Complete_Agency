import { describe, it, expect } from "vitest";
import { normaliseReferralCode, makeReferralCode, pickReferralSignal, isEmail } from "./agency-referral-rules";

describe("referral codes", () => {
  it("accepts what people type and link, and refuses junk", () => {
    expect(normaliseReferralCode(" houston-growth ")).toBe("HOUSTONGROWTH");
    expect(normaliseReferralCode("ab")).toBeNull();
    expect(normaliseReferralCode("x".repeat(21))).toBeNull();
    expect(normaliseReferralCode("drop table;")).toBeNull();
  });

  it("makes a readable code from the name, unique against those taken", () => {
    expect(makeReferralCode("Houston Barber Growth", new Set())).toBe("HOUSTONBARBERGRO");
    expect(makeReferralCode("Houston Barber Growth", new Set(["HOUSTONBARBERGRO"]))).toBe("HOUSTONBARBERGR2");
    expect(makeReferralCode("!!", new Set())).toBe("AGENCY");
    expect(makeReferralCode("AB", new Set())).toBe("ABX");
  });
});

/** Invite beats a typed code beats a link cookie — the order that decides who gets the credit. */
describe("which signal earns the credit", () => {
  const token = "A".repeat(32);
  it("prefers the invite, then the typed code, then the link", () => {
    expect(pickReferralSignal({ inviteToken: token, typedCode: "TYPED", linkCode: "LINKED" })).toEqual({ source: "invite", value: token });
    expect(pickReferralSignal({ typedCode: "TYPED", linkCode: "LINKED" })).toEqual({ source: "code", value: "TYPED" });
    expect(pickReferralSignal({ linkCode: "LINKED" })).toEqual({ source: "link", value: "LINKED" });
  });
  it("ignores malformed signals rather than guessing", () => {
    expect(pickReferralSignal({ inviteToken: "short", typedCode: "", linkCode: null })).toBeNull();
    expect(pickReferralSignal({ typedCode: "no!", linkCode: "OK123" })).toEqual({ source: "link", value: "OK123" });
  });
  it("validates invite emails", () => {
    expect(isEmail("owner@shop.com")).toBe(true);
    expect(isEmail("not an email")).toBe(false);
  });
});
