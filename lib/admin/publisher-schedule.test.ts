import { describe, expect, it } from "vitest";
import {
  parseWeeklySlots, easternParts, easternToInstant, isWeeklySlot, nextWeeklySlots,
  decide, planQueue, describeSlots, type PublisherSettings, type QueueEntry,
} from "./publisher-schedule";

// Fri Oct 2 2026, 13:25 EDT (UTC-4)
const NOW = new Date("2026-10-02T17:25:00Z");
const TUE_FRI_2PM = [{ day: 2, hour: 14 }, { day: 5, hour: 14 }];

describe("parseWeeklySlots", () => {
  it("drops bad entries, de-duplicates and sorts", () => {
    expect(parseWeeklySlots([{ day: 5, hour: 14 }, { day: 2, hour: 14 }, { day: 5, hour: 14 }, { day: 7, hour: 1 }, { day: 1, hour: 24 }, "x"]))
      .toEqual([{ day: 2, hour: 14 }, { day: 5, hour: 14 }]);
    expect(parseWeeklySlots(null)).toEqual([]);
  });
});

describe("eastern time", () => {
  it("reads the wall clock in New York", () => {
    expect(easternParts(NOW)).toEqual({ date: "2026-10-02", hour: 13, day: 5 });
  });
  it("converts wall-clock Eastern to the right instant on both sides of DST", () => {
    expect(easternToInstant("2026-10-06", 14).toISOString()).toBe("2026-10-06T18:00:00.000Z"); // EDT
    expect(easternToInstant("2026-11-10", 14).toISOString()).toBe("2026-11-10T19:00:00.000Z"); // EST
  });
});

describe("weekly slots", () => {
  it("knows when it is a slot", () => {
    expect(isWeeklySlot(TUE_FRI_2PM, new Date("2026-10-02T18:00:00Z"))).toBe(true);  // Fri 14:00 EDT
    expect(isWeeklySlot(TUE_FRI_2PM, NOW)).toBe(false);                                // Fri 13:25
  });
  it("lists the next slots after now", () => {
    expect(nextWeeklySlots(TUE_FRI_2PM, NOW, 3).map((d) => d.toISOString()))
      .toEqual(["2026-10-02T18:00:00.000Z", "2026-10-06T18:00:00.000Z", "2026-10-09T18:00:00.000Z"]);
  });
  it("returns nothing with no slots", () => {
    expect(nextWeeklySlots([], NOW, 3)).toEqual([]);
  });
  it("describes them", () => {
    expect(describeSlots(TUE_FRI_2PM)).toBe("Tue 2:00 PM, Fri 2:00 PM ET");
  });
});

const q = (id: string, position: number, scheduledFor: string | null = null, hasVideo = true): QueueEntry =>
  ({ id, position, scheduledFor, hasVideo });

describe("decide", () => {
  const on: PublisherSettings = { paused: false, weeklySlots: TUE_FRI_2PM };
  const at2pm = new Date("2026-10-02T18:00:00Z");

  it("does nothing while paused, even at a slot with a pinned post due", () => {
    expect(decide({ ...on, paused: true }, [q("a", 1, "2026-10-01T00:00:00Z")], at2pm)).toEqual({ kind: "paused" });
  });
  it("publishes the front of the line at a weekly slot", () => {
    expect(decide(on, [q("b", 2), q("a", 1)], at2pm)).toEqual({ kind: "publish", id: "a", reason: "weekly" });
  });
  it("skips a row with no video", () => {
    expect(decide(on, [q("a", 1, null, false), q("b", 2)], at2pm)).toEqual({ kind: "publish", id: "b", reason: "weekly" });
  });
  it("is not a slot off-schedule", () => {
    expect(decide(on, [q("a", 1)], NOW)).toEqual({ kind: "not_a_slot" });
  });
  it("a pinned post that is due goes out off-schedule and ahead of the line", () => {
    expect(decide(on, [q("a", 1), q("p", 5, "2026-10-02T17:00:00Z")], NOW)).toEqual({ kind: "publish", id: "p", reason: "pinned" });
  });
  it("a pinned post not yet due is not taken by the weekly slot", () => {
    expect(decide(on, [q("p", 1, "2026-10-09T18:00:00Z"), q("a", 2)], at2pm)).toEqual({ kind: "publish", id: "a", reason: "weekly" });
  });
});

describe("planQueue", () => {
  const on: PublisherSettings = { paused: false, weeklySlots: TUE_FRI_2PM };

  it("fills weekly slots in position order", () => {
    const p = planQueue(on, [q("a", 1), q("b", 2), q("c", 3)], NOW);
    expect(p.map((x) => x.at)).toEqual(["2026-10-02T18:00:00.000Z", "2026-10-06T18:00:00.000Z", "2026-10-09T18:00:00.000Z"]);
  });
  it("a pinned post keeps its time and takes that hour from the weekly line", () => {
    const p = planQueue(on, [q("a", 1), q("p", 2, "2026-10-06T18:00:00Z"), q("b", 3)], NOW);
    expect(p.find((x) => x.id === "p")).toMatchObject({ at: "2026-10-06T18:00:00.000Z", pinned: true, overdue: false });
    expect(p.find((x) => x.id === "a")!.at).toBe("2026-10-02T18:00:00.000Z");
    expect(p.find((x) => x.id === "b")!.at).toBe("2026-10-09T18:00:00.000Z");
  });
  it("marks a pinned time already past as overdue", () => {
    expect(planQueue(on, [q("p", 1, "2026-10-01T18:00:00Z")], NOW)[0]).toMatchObject({ pinned: true, overdue: true });
  });
  it("with no weekly slots, unpinned posts have no time", () => {
    expect(planQueue({ paused: false, weeklySlots: [] }, [q("a", 1)], NOW)[0].at).toBeNull();
  });
  it("a row with no video never gets a time", () => {
    expect(planQueue(on, [q("a", 1, null, false), q("b", 2)], NOW).map((x) => x.at))
      .toEqual([null, "2026-10-02T18:00:00.000Z"]);
  });
});
