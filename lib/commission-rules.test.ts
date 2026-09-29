import { describe, it, expect } from "vitest";
import { commissionFor, payableAt, summarize, dollars } from "./commission-rules";
import { COMMISSION_HOLD_DAYS, MIN_PAYOUT_CENTS } from "./plans";

const now = new Date("2026-11-15T00:00:00Z");
const past = "2026-11-01T00:00:00Z";
const future = "2026-12-01T00:00:00Z";

describe("commission rules", () => {
  it("pins the hold and the minimum payout", () => {
    expect(COMMISSION_HOLD_DAYS).toBe(30);
    expect(MIN_PAYOUT_CENTS).toBe(5000);
  });

  it("is the rate on what the client kept paid", () => {
    expect(commissionFor(4900, 0, 0.25)).toBe(1225);
    expect(commissionFor(4900, 4900, 0.25)).toBe(0);
    expect(commissionFor(9900, 5000, 0.25)).toBe(1225);
    expect(commissionFor(1900, 0, 0.25)).toBe(475);
    expect(commissionFor(100, 500, 0.25)).toBe(0);
  });

  it("becomes payable after the refund window", () => {
    expect(payableAt(new Date("2026-10-01T00:00:00Z")).toISOString()).toBe("2026-10-31T00:00:00.000Z");
  });

  it("splits what's pending, ready and paid", () => {
    const e = summarize([
      { commission_cents: 2475, paid_out_cents: 0, payable_at: future },
      { commission_cents: 2475, paid_out_cents: 0, payable_at: past },
      { commission_cents: 2475, paid_out_cents: 2475, payable_at: past },
    ], now);
    expect(e).toEqual({ pendingCents: 2475, readyCents: 2475, paidCents: 2475, earnedCents: 7425, canPayOut: false });
  });

  it("takes a refund after payout back off what's ready", () => {
    const e = summarize([
      { commission_cents: 0, paid_out_cents: 2475, payable_at: past },
      { commission_cents: 9900, paid_out_cents: 0, payable_at: past },
    ], now);
    expect(e.readyCents).toBe(7425);
    expect(e.canPayOut).toBe(true);
  });

  it("formats money", () => {
    expect(dollars(1225)).toBe("$12.25");
    expect(dollars(-2475)).toBe("-$24.75");
    expect(dollars(123456)).toBe("$1,234.56");
  });
});
