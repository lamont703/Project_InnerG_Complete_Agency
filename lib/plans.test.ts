import { describe, it, expect } from "vitest";
import { COMMISSION_RATE, FREE_PUBLISHES_PER_MONTH, PRICES, hasPaidPlans, monthWindow, planAllows, planSummary, publishAllowance } from "./plans";

/** The agreed numbers (2026-09-28). Changing one is a pricing decision, visible here in review. */
describe("plans", () => {
  it("pins the agreed allowance, commission and prices", () => {
    expect(FREE_PUBLISHES_PER_MONTH).toBe(3);
    expect(COMMISSION_RATE).toBe(0.25);
    expect(PRICES).toEqual({
      barber: { manage: 19, autopilot: 39 },
      cosmetologist: { manage: 19, autopilot: 39 },
      barbershop: { manage: 49, autopilot: 99 },
      salon: { manage: 49, autopilot: 99 },
      supply_store: { manage: 39, autopilot: 79 },
      school: { manage: 99, autopilot: 199 },
    });
  });

  it("keeps students, clients and agencies free", () => {
    for (const t of ["student", "client", "agency"] as const) expect(hasPaidPlans(t)).toBe(false);
    expect(hasPaidPlans(null)).toBe(false);
    expect(hasPaidPlans("school")).toBe(true);
  });

  it("gives Free three publishes a month, then stops", () => {
    expect(publishAllowance("free", 0)).toMatchObject({ allowed: true, remaining: 3 });
    expect(publishAllowance("free", 2)).toMatchObject({ allowed: true, remaining: 1 });
    expect(publishAllowance("free", 3)).toMatchObject({ allowed: false, remaining: 0 });
    expect(publishAllowance("free", 9)).toMatchObject({ allowed: false, remaining: 0 });
  });

  it("lets Manage and Autopilot publish without a limit", () => {
    expect(publishAllowance("manage", 500)).toEqual({ allowed: true, unlimited: true });
    expect(publishAllowance("autopilot", 500)).toEqual({ allowed: true, unlimited: true });
  });

  it("puts the calendar and Instagram on Manage, and autopilot features on Autopilot", () => {
    expect(planAllows("free", "calendar")).toBe(false);
    expect(planAllows("manage", "calendar")).toBe(true);
    expect(planAllows("manage", "instagram")).toBe(true);
    expect(planAllows("manage", "autopilot")).toBe(false);
    expect(planAllows("autopilot", "autopilot")).toBe(true);
  });

  it("resets on the 1st of the month", () => {
    const { start, next } = monthWindow(new Date("2026-09-28T15:00:00Z"));
    expect(start.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(next.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(monthWindow(new Date("2026-12-31T23:00:00Z")).next.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("tells the owner what's left and never says a plan can be bought", () => {
    const s = planSummary("free", "salon", 1, new Date("2026-09-28T00:00:00Z"));
    expect(s).toContain("2 of 3 free publishes left");
    expect(s).toContain("October 1");
    expect(s).toContain("$49");
    expect(s).toContain("aren't open for checkout");
    expect(planSummary("manage", "salon", 40)).toBe("Manage plan — unlimited publishing.");
  });
});
