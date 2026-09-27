import { describe, it, expect } from "vitest";
import {
  normaliseDay,
  normaliseTime,
  mergeRegularHours,
  describeWeek,
  normaliseCategoryName,
  normaliseAttributeName,
  resourceUnderLocation,
  isIsoDate,
} from "./gbp-change-rules";

const WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map((d) => ({
  openDay: d, openTime: { hours: 9 }, closeDay: d, closeTime: { hours: 18 },
}));

describe("normaliseTime", () => {
  it("reads the spellings a model sends", () => {
    expect(normaliseTime("9am")).toEqual({ hours: 9 });
    expect(normaliseTime("5:30 pm")).toEqual({ hours: 17, minutes: 30 });
    expect(normaliseTime("12pm")).toEqual({ hours: 12 });
    expect(normaliseTime("12am")).toEqual({ hours: 0 });
    expect(normaliseTime("17:30")).toEqual({ hours: 17, minutes: 30 });
  });

  it("refuses a bare hour, because 9 could be morning or night", () => {
    expect(normaliseTime("9")).toBeNull();
    expect(normaliseTime("13pm")).toBeNull();
    expect(normaliseTime("")).toBeNull();
  });
});

describe("normaliseDay", () => {
  it("accepts full names and three-letter abbreviations only", () => {
    expect(normaliseDay("monday")).toBe("MONDAY");
    expect(normaliseDay("Sat")).toBe("SATURDAY");
    expect(normaliseDay("T")).toBeNull(); // Tuesday or Thursday
    expect(normaliseDay("funday")).toBeNull();
  });
});

/**
 * regularHours is replaced WHOLESALE by Google. The property that matters is
 * that changing one day never deletes the others.
 */
describe("mergeRegularHours", () => {
  it("changes only the day named and keeps the rest of the week", () => {
    const r = mergeRegularHours(WEEKDAYS, [{ day: "saturday", open: "10am", close: "4pm" }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.periods).toHaveLength(6);
    expect(r.periods.filter((p) => p.openDay === "MONDAY")).toHaveLength(1);
    expect(r.periods.find((p) => p.openDay === "SATURDAY")?.openTime).toEqual({ hours: 10 });
  });

  it("closes a day by removing its periods", () => {
    const r = mergeRegularHours(WEEKDAYS, [{ day: "friday", closed: true }]);
    expect(r.ok && r.periods.some((p) => p.openDay === "FRIDAY")).toBe(false);
    expect(r.ok && r.periods).toHaveLength(4);
  });

  it("supports a split shift as two entries for one day", () => {
    const r = mergeRegularHours(WEEKDAYS, [
      { day: "monday", open: "9am", close: "12pm" },
      { day: "monday", open: "1pm", close: "6pm" },
    ]);
    expect(r.ok && r.periods.filter((p) => p.openDay === "MONDAY")).toHaveLength(2);
  });

  it("refuses overnight hours and contradictions instead of guessing", () => {
    expect(mergeRegularHours(WEEKDAYS, [{ day: "friday", open: "10pm", close: "2am" }]).ok).toBe(false);
    expect(
      mergeRegularHours(WEEKDAYS, [{ day: "friday", closed: true }, { day: "friday", open: "9am", close: "5pm" }]).ok
    ).toBe(false);
    expect(mergeRegularHours(WEEKDAYS, [{ day: "friday", open: "9am" }]).ok).toBe(false);
    expect(mergeRegularHours(WEEKDAYS, []).ok).toBe(false);
  });

  it("describes the week in order, with closed days named", () => {
    const lines = describeWeek(WEEKDAYS);
    expect(lines[0]).toBe("Monday: 9am–6pm");
    expect(lines[6]).toBe("Sunday: closed");
  });
});

describe("ids", () => {
  it("normalises category ids three ways and refuses display names", () => {
    expect(normaliseCategoryName("gcid:hair_salon")).toBe("categories/gcid:hair_salon");
    expect(normaliseCategoryName("categories/gcid:hair_salon")).toBe("categories/gcid:hair_salon");
    expect(normaliseCategoryName("hair_salon")).toBe("categories/gcid:hair_salon");
    expect(normaliseCategoryName("Hair salon")).toBeNull();
  });

  it("normalises attribute ids", () => {
    expect(normaliseAttributeName("has_wifi")).toBe("attributes/has_wifi");
    expect(normaliseAttributeName("attributes/has_wifi")).toBe("attributes/has_wifi");
    expect(normaliseAttributeName("has wifi")).toBeNull();
  });

  /**
   * The ownership check. A review, post or photo id from anywhere else must
   * not become a write against a listing this owner does not manage.
   */
  it("only accepts resources under the owner's own location", () => {
    const base = { accountName: "accounts/1", locationName: "locations/2", collection: "reviews" as const };
    expect(resourceUnderLocation({ ...base, raw: "abc123" })).toBe("accounts/1/locations/2/reviews/abc123");
    expect(resourceUnderLocation({ ...base, raw: "accounts/1/locations/2/reviews/abc123" })).toBe(
      "accounts/1/locations/2/reviews/abc123"
    );
    expect(resourceUnderLocation({ ...base, raw: "accounts/1/locations/9/reviews/abc123" })).toBeNull();
    expect(resourceUnderLocation({ ...base, raw: "accounts/1/locations/2/reviews/abc/../x" })).toBeNull();
    expect(resourceUnderLocation({ ...base, raw: "../../locations/9" })).toBeNull();
    expect(resourceUnderLocation({ ...base, raw: "" })).toBeNull();
  });

  it("accepts only real calendar dates", () => {
    expect(isIsoDate("2026-12-25")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("12/25/2026")).toBe(false);
  });
});
