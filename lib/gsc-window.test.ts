import { describe, it, expect } from "vitest";
import {
  resolveGscWindow,
  latestAvailableDay,
  earliestAvailableDay,
  windowShortLabel,
  GSC_PRESETS,
  GSC_LAG_DAYS,
} from "./gsc-window";

// Fixed "now" so the clamping rules can be asserted against real dates.
const NOW = new Date("2026-07-30T14:00:00Z");
const LATEST = "2026-07-28"; // NOW − 2 days of reporting lag
const EARLIEST = "2025-04-04"; // LATEST − 480 days

describe("available range", () => {
  it("stops at Search Console's reporting lag rather than today", () => {
    expect(latestAvailableDay(NOW).toISOString().slice(0, 10)).toBe(LATEST);
    expect(GSC_LAG_DAYS).toBe(2);
  });

  it("reaches back about 16 months", () => {
    expect(earliestAvailableDay(NOW).toISOString().slice(0, 10)).toBe(EARLIEST);
  });

  it("is unaffected by the time of day, so windows don't shift by timezone", () => {
    const early = latestAvailableDay(new Date("2026-07-30T00:05:00Z"));
    const late = latestAvailableDay(new Date("2026-07-30T23:55:00Z"));
    expect(early.getTime()).toBe(late.getTime());
  });
});

describe("presets", () => {
  it("defaults to the last 28 days when nothing is asked for", () => {
    const w = resolveGscWindow({}, NOW);
    expect(w.preset).toBe("28d");
    expect(w.end).toBe(LATEST);
    expect(w.start).toBe("2026-07-01"); // 28 days inclusive
    expect(w.days).toBe(28);
    expect(w.notice).toBeUndefined();
  });

  it("produces an inclusive window of exactly the advertised length", () => {
    for (const p of GSC_PRESETS) {
      const w = resolveGscWindow({ preset: p.key }, NOW);
      expect(w.days, p.key).toBe(p.days);
      expect(w.end, p.key).toBe(LATEST);
    }
  });

  it("falls back to the default and says so for an unknown preset", () => {
    const w = resolveGscWindow({ preset: "42y" }, NOW);
    expect(w.preset).toBe("28d");
    expect(w.notice).toMatch(/Unknown range/);
  });
});

describe("custom ranges", () => {
  it("uses an explicit range as given", () => {
    const w = resolveGscWindow({ start: "2026-06-01", end: "2026-06-30" }, NOW);
    expect(w.preset).toBe("custom");
    expect(w.start).toBe("2026-06-01");
    expect(w.end).toBe("2026-06-30");
    expect(w.days).toBe(30);
    expect(w.label).toBe("2026-06-01 → 2026-06-30");
    expect(w.notice).toBeUndefined();
  });

  it("takes precedence over a preset when both are present", () => {
    const w = resolveGscWindow({ preset: "7d", start: "2026-06-01", end: "2026-06-30" }, NOW);
    expect(w.preset).toBe("custom");
    expect(w.start).toBe("2026-06-01");
  });

  it("swaps a reversed range instead of returning nothing", () => {
    const w = resolveGscWindow({ start: "2026-06-30", end: "2026-06-01" }, NOW);
    expect(w.start).toBe("2026-06-01");
    expect(w.end).toBe("2026-06-30");
    expect(w.notice).toMatch(/reversed/);
  });

  it("clamps an end date inside the reporting lag, which would otherwise read as zero traffic", () => {
    const w = resolveGscWindow({ start: "2026-07-01", end: "2026-07-30" }, NOW);
    expect(w.end).toBe(LATEST);
    expect(w.notice).toMatch(/lags about 2 days/);
  });

  it("clamps a start date past the retention limit, which would otherwise return an empty set", () => {
    const w = resolveGscWindow({ start: "2020-01-01", end: "2026-07-28" }, NOW);
    expect(w.start).toBe(EARLIEST);
    expect(w.notice).toMatch(/16 months/);
  });

  it("collapses a range entirely in the future to the latest available day", () => {
    const w = resolveGscWindow({ start: "2027-01-01", end: "2027-02-01" }, NOW);
    expect(w.start).toBe(LATEST);
    expect(w.end).toBe(LATEST);
    expect(w.days).toBe(1);
    expect(w.notice).toMatch(/future/);
  });

  it("accepts a single day", () => {
    const w = resolveGscWindow({ start: "2026-06-15", end: "2026-06-15" }, NOW);
    expect(w.days).toBe(1);
  });

  it("requires both ends, rather than guessing the other one", () => {
    for (const partial of [{ start: "2026-06-01" }, { end: "2026-06-30" }]) {
      const w = resolveGscWindow(partial, NOW);
      expect(w.preset).toBe("28d");
      expect(w.notice).toMatch(/Both a start and end date/);
    }
  });

  it("rejects malformed dates instead of letting Date coerce them", () => {
    for (const bad of ["06/01/2026", "2026-6-1", "yesterday", "2026-13-01", ""]) {
      const w = resolveGscWindow({ start: bad, end: "2026-06-30" }, NOW);
      expect(w.preset, bad).toBe("28d");
    }
  });

  it("rejects a date that looks valid but rolls over", () => {
    // Date would silently turn this into March 3rd.
    const w = resolveGscWindow({ start: "2026-02-31", end: "2026-06-30" }, NOW);
    expect(w.preset).toBe("28d");
    expect(w.notice).toMatch(/Both a start and end date/);
  });
});

describe("windowShortLabel", () => {
  it("uses days for short windows and months for long ones", () => {
    expect(windowShortLabel(resolveGscWindow({ preset: "7d" }, NOW))).toBe("7d");
    expect(windowShortLabel(resolveGscWindow({ preset: "28d" }, NOW))).toBe("28d");
    expect(windowShortLabel(resolveGscWindow({ preset: "90d" }, NOW))).toBe("3mo");
    expect(windowShortLabel(resolveGscWindow({ preset: "365d" }, NOW))).toBe("12mo");
  });
});
