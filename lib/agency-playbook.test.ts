import { describe, it, expect } from "vitest";
import { playbookSections, PLAYBOOK_TOPICS } from "./agency-playbook";

const text = playbookSections().flatMap((s) => s.body).join(" ");

describe("the agency playbook", () => {
  it("quotes commission computed from the real prices and rate", () => {
    expect(text).toContain("barbershop or salon on Manage ($49) earns you $12.25");
    expect(text).toContain("on Autopilot ($99) earns you $24.75");
    expect(text).toContain("barber or stylist on Manage earns you $4.75");
    expect(text).toContain("ten barbershops on Manage bring you $122.50 a month");
    expect(text).toContain("30 days after we receive it");
    expect(text).toContain("at least $50 is ready");
  });

  it("has every topic the tool offers", () => {
    expect(playbookSections().map((s) => s.id)).toEqual([...PLAYBOOK_TOPICS]);
  });

  it("carries the rules agencies must not break", () => {
    expect(text).toContain("Never promise rankings");
    expect(text).toContain("from your own email, phone and DMs, not ShearQuery's");
    expect(text).toContain("Never sell a feature that's still in testing as available");
  });
});
