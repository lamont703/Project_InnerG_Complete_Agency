import { describe, it, expect } from "vitest";
import { mondayOf, addWeeks, weeksBetween, weekLabel } from "./weeks";

describe("mondayOf", () => {
  it("returns the same day when given a Monday", () => {
    expect(mondayOf("2026-03-02")).toBe("2026-03-02");
  });

  it("walks back to Monday from mid-week", () => {
    expect(mondayOf("2026-03-04")).toBe("2026-03-02");
    expect(mondayOf("2026-03-07")).toBe("2026-03-02");
  });

  /*
   * The one that would silently corrupt a record. Sunday is the END of its
   * week, not the start of the next one — a payment logged on Sunday belongs
   * to the week that began six days earlier. Getting this backwards shifts a
   * whole tradeline by one week and blames people for weeks they paid.
   */
  it("treats Sunday as the end of the week it closes, not the start of the next", () => {
    expect(mondayOf("2026-03-08")).toBe("2026-03-02");
  });

  it("crosses a month boundary", () => {
    expect(mondayOf("2026-04-01")).toBe("2026-03-30");
  });

  it("crosses a year boundary", () => {
    expect(mondayOf("2026-01-01")).toBe("2025-12-29");
  });
});

describe("addWeeks", () => {
  it("moves forward and back", () => {
    expect(addWeeks("2026-03-02", 1)).toBe("2026-03-09");
    expect(addWeeks("2026-03-02", -1)).toBe("2026-02-23");
  });

  // Weeks are added in whole days, so a DST change must not move the date.
  it("is unaffected by a US daylight-saving transition", () => {
    expect(addWeeks("2026-03-02", 2)).toBe("2026-03-16");
  });
});

describe("weeksBetween", () => {
  it("is inclusive of both ends and ordered newest first", () => {
    expect(weeksBetween("2026-03-02", "2026-03-23")).toEqual([
      "2026-03-23",
      "2026-03-16",
      "2026-03-09",
      "2026-03-02",
    ]);
  });

  it("returns a single week when start and end share one", () => {
    expect(weeksBetween("2026-03-04", "2026-03-06")).toEqual(["2026-03-02"]);
  });

  it("returns nothing when the range runs backwards", () => {
    expect(weeksBetween("2026-03-23", "2026-03-02")).toEqual([]);
  });

  /*
   * The guard, not a feature. An empty date field arriving as 1970 would
   * otherwise try to build ~2,900 rows and hang the browser.
   */
  it("caps a runaway range instead of building thousands of rows", () => {
    const out = weeksBetween("1970-01-01", "2026-03-02", 260);
    expect(out).toHaveLength(260);
    expect(out[0]).toBe("2026-03-02");
  });
});

describe("weekLabel", () => {
  // Rendered in UTC deliberately: a label computed in local time shows the
  // previous day for anyone west of Greenwich.
  it("labels the Monday it was given, regardless of local timezone", () => {
    expect(weekLabel("2026-03-02")).toBe("Mar 2, 2026");
  });
});
