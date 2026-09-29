import { describe, it, expect } from "vitest";
import { lookupKey, planFromSubscriptions } from "./rules";

describe("billing rules", () => {
  it("takes the best live subscription, and drops to Free when none is live", () => {
    expect(planFromSubscriptions([])).toBe("free");
    expect(planFromSubscriptions([{ plan: "manage", status: "active" }])).toBe("manage");
    expect(planFromSubscriptions([{ plan: "manage", status: "active" }, { plan: "autopilot", status: "trialing" }])).toBe("autopilot");
    expect(planFromSubscriptions([{ plan: "autopilot", status: "canceled" }, { plan: "manage", status: "active" }])).toBe("manage");
    for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) {
      expect(planFromSubscriptions([{ plan: "autopilot", status }]), status).toBe("free");
    }
  });

  it("keeps the plan while a payment is being retried", () => {
    expect(planFromSubscriptions([{ plan: "manage", status: "past_due" }])).toBe("manage");
  });

  it("puts the amount in the price key, so a price change makes a new Stripe price", () => {
    expect(lookupKey("barbershop", "manage", 49)).toBe("shearquery_barbershop_manage_49usd_monthly");
    expect(lookupKey("barbershop", "manage", 59)).not.toBe(lookupKey("barbershop", "manage", 49));
  });
});
