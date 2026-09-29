import { describe, it, expect } from "vitest";
import {
  DEFAULT_POLICY, policyFrom, effectiveMode, amountDueCents, clientMayChange, bookingRefundCents, policyLines, parsePolicyInput,
  type BookingPolicy,
} from "./policy";

const p = (over: Partial<BookingPolicy> = {}): BookingPolicy => ({ ...DEFAULT_POLICY, ...over });

describe("what a client pays at booking", () => {
  it("is nothing when the pro takes no payment", () => {
    expect(amountDueCents(p(), "none", 3500)).toBe(0);
  });
  it("is the whole price for full payment", () => {
    expect(amountDueCents(p({ payment_mode: "full" }), "full", 3500)).toBe(3500);
  });
  it("is a percent of the price, rounded to the cent", () => {
    expect(amountDueCents(p({ payment_mode: "deposit", deposit_kind: "percent", deposit_value: 25 }), "deposit", 3500)).toBe(875);
  });
  it("never charges a fixed deposit above the price", () => {
    expect(amountDueCents(p({ payment_mode: "deposit", deposit_kind: "fixed", deposit_value: 2000 }), "deposit", 1500)).toBe(1500);
  });
  it("charges nothing below Stripe's 50-cent minimum, or for a price-varies service on a percent", () => {
    expect(amountDueCents(p({ payment_mode: "deposit", deposit_value: 1 }), "deposit", 1000)).toBe(0);
    expect(amountDueCents(p({ payment_mode: "deposit" }), "deposit", null)).toBe(0);
    expect(amountDueCents(p({ payment_mode: "full" }), "full", null)).toBe(0);
  });
  it("takes payment only on the Manage plan with a ready Stripe account", () => {
    const pol = p({ payment_mode: "deposit" });
    expect(effectiveMode(pol, { planAllowsPayments: true, paymentsReady: true })).toBe("deposit");
    expect(effectiveMode(pol, { planAllowsPayments: false, paymentsReady: true })).toBe("none");
    expect(effectiveMode(pol, { planAllowsPayments: true, paymentsReady: false })).toBe("none");
  });
});

describe("whether a client may change a booking online", () => {
  it("follows the pro's cutoff", () => {
    expect(clientMayChange(p({ change_cutoff_minutes: 120 }), "cancel", 121).ok).toBe(true);
    expect(clientMayChange(p({ change_cutoff_minutes: 120 }), "cancel", 119).ok).toBe(false);
  });
  it("can be switched off for cancel and move separately", () => {
    expect(clientMayChange(p({ client_can_cancel: false }), "cancel", 9999).ok).toBe(false);
    expect(clientMayChange(p({ client_can_cancel: false }), "reschedule", 9999).ok).toBe(true);
  });
  it("caps how many times a booking can be moved", () => {
    expect(clientMayChange(p({ max_reschedules: 1 }), "reschedule", 9999, 0).ok).toBe(true);
    expect(clientMayChange(p({ max_reschedules: 1 }), "reschedule", 9999, 1).ok).toBe(false);
  });
});

describe("refunds", () => {
  const pol = p({ payment_mode: "deposit", full_refund_minutes: 1440, late_cancel_refund_percent: 50, no_show_refund_percent: 0 });
  it("refunds in full when cancelled early enough", () => {
    expect(bookingRefundCents(pol, "client", 1000, 1440)).toBe(1000);
  });
  it("refunds the late percent when cancelled late", () => {
    expect(bookingRefundCents(pol, "client", 1000, 600)).toBe(500);
  });
  it("keeps the no-show percent", () => {
    expect(bookingRefundCents(pol, "no_show", 1000, -30)).toBe(0);
  });
  it("always refunds everything when the pro cancels", () => {
    expect(bookingRefundCents(p({ late_cancel_refund_percent: 0 }), "pro", 1000, 10)).toBe(1000);
  });
});

describe("the rules in words", () => {
  it("says what's paid, when it can change and what's refunded", () => {
    const lines = policyLines(p({ payment_mode: "deposit", deposit_value: 20 }), "deposit", 3000);
    expect(lines[0]).toContain("$6");
    expect(lines.join(" ")).toContain("up to 2 hours before");
    expect(lines.join(" ")).toContain("at least 1 day ahead for a full refund");
    expect(lines.join(" ")).toContain("don't show up, the payment is kept");
  });
  it("doesn't mention refunds when nothing is paid", () => {
    expect(policyLines(p(), "none").join(" ")).not.toContain("refund");
  });
});

describe("parsing a pro's change", () => {
  it("turns dollars and hours into cents and minutes", () => {
    const r = parsePolicyInput({ payment_mode: "deposit", deposit_dollars: 10, change_cutoff_hours: 4, full_refund_hours: 48 });
    expect(r).toEqual({ ok: true, patch: { payment_mode: "deposit", deposit_kind: "fixed", deposit_value: 1000, change_cutoff_minutes: 240, full_refund_minutes: 2880 } });
  });
  it("refuses a deposit given both ways, and out-of-range percents", () => {
    expect(parsePolicyInput({ deposit_percent: 20, deposit_dollars: 5 }).ok).toBe(false);
    expect(parsePolicyInput({ late_cancel_refund_percent: 150 }).ok).toBe(false);
    expect(parsePolicyInput({ payment_mode: "sometimes" }).ok).toBe(false);
  });
  it("accepts unlimited moves", () => {
    expect(parsePolicyInput({ max_reschedules: "unlimited" })).toEqual({ ok: true, patch: { max_reschedules: null } });
  });
  it("fills a partial snapshot with defaults", () => {
    expect(policyFrom({ payment_mode: "full" }).change_cutoff_minutes).toBe(120);
  });
});
