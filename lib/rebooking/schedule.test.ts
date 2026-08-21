import { describe, it, expect } from "vitest";
import {
  isWithinSendWindow,
  hourInTimezone,
  localDateInTimezone,
  describeWindow,
  DEFAULT_WINDOW,
} from "./schedule";

describe("hourInTimezone", () => {
  it("converts UTC to Eastern during DST (EDT, UTC-4)", () => {
    // 2026-08-20 is inside daylight saving.
    expect(hourInTimezone(new Date("2026-08-20T17:00:00Z"), "America/New_York")).toBe(13);
  });

  it("converts UTC to Eastern outside DST (EST, UTC-5)", () => {
    // 2026-01-15 is standard time. Same UTC hour, different local hour — this
    // is the whole reason a hardcoded offset is wrong.
    expect(hourInTimezone(new Date("2026-01-15T17:00:00Z"), "America/New_York")).toBe(12);
  });

  it("reports midnight as 0, not 24", () => {
    expect(hourInTimezone(new Date("2026-08-20T04:00:00Z"), "America/New_York")).toBe(0);
  });
});

describe("isWithinSendWindow", () => {
  it("allows 9am Eastern exactly", () => {
    expect(isWithinSendWindow(new Date("2026-08-20T13:00:00Z"), DEFAULT_WINDOW)).toBe(true);
  });

  it("blocks 8:59am Eastern", () => {
    expect(isWithinSendWindow(new Date("2026-08-20T12:59:00Z"), DEFAULT_WINDOW)).toBe(false);
  });

  it("allows 5:59pm Eastern", () => {
    expect(isWithinSendWindow(new Date("2026-08-20T21:59:00Z"), DEFAULT_WINDOW)).toBe(true);
  });

  it("blocks 6pm Eastern on the nose", () => {
    // "between 9am and 6pm" should not fire AT 6pm.
    expect(isWithinSendWindow(new Date("2026-08-20T22:00:00Z"), DEFAULT_WINDOW)).toBe(false);
  });

  it("blocks the middle of the night", () => {
    expect(isWithinSendWindow(new Date("2026-08-20T07:00:00Z"), DEFAULT_WINDOW)).toBe(false);
  });

  it("holds the window across the DST boundary", () => {
    // 14:00 UTC is 10am EDT in summer and 9am EST in winter — both inside.
    expect(isWithinSendWindow(new Date("2026-08-20T14:00:00Z"), DEFAULT_WINDOW)).toBe(true);
    expect(isWithinSendWindow(new Date("2026-01-15T14:00:00Z"), DEFAULT_WINDOW)).toBe(true);
    // 13:00 UTC is 9am EDT (inside) but 8am EST (outside). A fixed offset would
    // get exactly one of these wrong for four months of the year.
    expect(isWithinSendWindow(new Date("2026-08-20T13:00:00Z"), DEFAULT_WINDOW)).toBe(true);
    expect(isWithinSendWindow(new Date("2026-01-15T13:00:00Z"), DEFAULT_WINDOW)).toBe(false);
  });
});

describe("localDateInTimezone", () => {
  it("uses the local calendar day, not UTC's", () => {
    // 01:00 UTC on the 21st is still the evening of the 20th in New York. A
    // daily cap keyed on the UTC date would reset itself at 8pm Eastern.
    expect(localDateInTimezone(new Date("2026-08-21T01:00:00Z"), "America/New_York")).toBe("2026-08-20");
  });
});

describe("describeWindow", () => {
  it("reads the way a person would say it", () => {
    expect(describeWindow(DEFAULT_WINDOW)).toBe("9am–6pm New York");
  });
});
