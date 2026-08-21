import { describe, it, expect } from "vitest";
import {
  FREE_PER_DAY,
  MEMBER_PER_DAY,
  isBareEmail,
  needsDisclosure,
  rateState,
  shouldOfferMembership,
  type DmThreadState,
} from "./instagram-dm-policy";

const thread = (over: Partial<DmThreadState> = {}): DmThreadState => ({
  memberId: null,
  disclosedAt: null,
  usageDay: null,
  messagesToday: 0,
  exchanges: 0,
  offeredMembershipAt: null,
  lastMessageAt: null,
  ...over,
});

const NOW = new Date("2026-08-21T15:00:00Z");

describe("bot disclosure", () => {
  // Legally required for California users, and California is a market this
  // site is actively entering — so this is not a courtesy test.
  it("is required on a brand new thread", () => {
    expect(needsDisclosure(thread(), NOW)).toBe(true);
  });

  it("is not repeated on the next message", () => {
    expect(needsDisclosure(thread({ disclosedAt: "2026-08-21T14:00:00Z" }), NOW)).toBe(false);
  });

  it("is repeated after a long silence", () => {
    expect(needsDisclosure(thread({ disclosedAt: "2026-06-01T00:00:00Z" }), NOW)).toBe(true);
  });
});

describe("rate limit", () => {
  it("gives an unlinked sender the free allowance", () => {
    expect(rateState(thread(), NOW).limit).toBe(FREE_PER_DAY);
  });

  it("gives a linked member the website allowance", () => {
    expect(rateState(thread({ memberId: "m1" }), NOW).limit).toBe(MEMBER_PER_DAY);
  });

  it("blocks once the free allowance is spent", () => {
    const t = thread({ usageDay: "2026-08-21", messagesToday: FREE_PER_DAY });
    expect(rateState(t, NOW).allowed).toBe(false);
  });

  it("allows the last free question rather than blocking early", () => {
    const t = thread({ usageDay: "2026-08-21", messagesToday: FREE_PER_DAY - 1 });
    const r = rateState(t, NOW);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(0);
  });

  /**
   * The counter is stored with the day it belongs to. Without the rollover
   * check, yesterday's spent allowance would still be blocking today — the
   * failure being that the limit silently becomes permanent.
   */
  it("resets when the day rolls over", () => {
    const t = thread({ usageDay: "2026-08-20", messagesToday: 99 });
    const r = rateState(t, NOW);
    expect(r.allowed).toBe(true);
    expect(r.resets).toBe(true);
  });
});

describe("membership offer", () => {
  it("is not made on the first message", () => {
    expect(shouldOfferMembership(thread({ exchanges: 0 }))).toBe(false);
  });

  it("is made once there has been real value", () => {
    expect(shouldOfferMembership(thread({ exchanges: 2 }))).toBe(true);
  });

  it("is never made twice", () => {
    const t = thread({ exchanges: 9, offeredMembershipAt: "2026-08-20T10:00:00Z" });
    expect(shouldOfferMembership(t)).toBe(false);
  });

  it("is never made to someone who already linked", () => {
    expect(shouldOfferMembership(thread({ exchanges: 9, memberId: "m1" }))).toBe(false);
  });
});

describe("email capture", () => {
  it("accepts a bare address", () => {
    expect(isBareEmail("  Sam@Example.COM ")).toBe("sam@example.com");
  });

  /**
   * STRICT ON PURPOSE. Pulling an address out of the middle of a sentence
   * would catch someone quoting a shop's contact email or asking a question
   * that happens to contain one — and creating an account for a third party
   * off the back of that is not something an apology fixes.
   */
  it("refuses an address buried in a sentence", () => {
    expect(isBareEmail("you can reach the shop at info@shop.com i think")).toBeNull();
    expect(isBareEmail("is jo@barbers.com the right contact?")).toBeNull();
  });

  it("refuses things that are not addresses", () => {
    expect(isBareEmail("houston")).toBeNull();
    expect(isBareEmail("@shearquery")).toBeNull();
    expect(isBareEmail("what's the pass rate")).toBeNull();
  });
});
