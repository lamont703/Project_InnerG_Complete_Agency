import { describe, it, expect } from "vitest";
import { defaultAgencyCaption, parseSlotHours, upcomingSlots, CAPTION_MAX } from "./agency-publisher-rules";

describe("the agency's caption", () => {
  it("credits @shearquery, points to the Monday training in their bio, and drops our own CTA", () => {
    const c = defaultAgencyCaption({ title: "Fade tips", stat: null, label: null, question: "Which fade?", caption: null } as any);
    expect(c).toContain("@shearquery");
    expect(c).toContain("every Monday, 3 PM ET");
    expect(c).not.toContain("Pass rates, kit lists and state board guides");
  });
  it("stays within Instagram's 2,200 characters", () => {
    expect(defaultAgencyCaption({ title: "x", caption: "y".repeat(3000) } as any).length).toBeLessThanOrEqual(CAPTION_MAX);
  });
});

describe("slots", () => {
  it("reads the ways people say the three slots", () => {
    expect(parseSlotHours("2pm, 7pm")).toEqual([14, 19]);
    expect(parseSlotHours(["morning", "evening"])).toEqual([9, 19]);
    expect(parseSlotHours("noon")).toBeNull();
  });
  it("maps the line onto the next slots, skipping ones already past today", () => {
    const s = upcomingSlots({ easternHour: 10, slotHours: [9, 14, 19], paused: false, queueTitles: ["A", "B", "C"] });
    expect(s).toEqual([
      { label: "Today 2:00 PM ET", title: "A" },
      { label: "Today 7:00 PM ET", title: "B" },
      { label: "Tomorrow 9:00 AM ET", title: "C" },
    ]);
  });
  it("shows nothing while paused", () => {
    expect(upcomingSlots({ easternHour: 10, slotHours: [14], paused: true, queueTitles: ["A"] })).toEqual([]);
  });
});
