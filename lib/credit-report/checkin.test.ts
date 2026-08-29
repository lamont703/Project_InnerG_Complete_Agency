import { describe, it, expect } from "vitest";
import {
  checkinPeriod, outstandingWeeks, isStale, checkinSms, checkinEmailHtml,
  STALE_AFTER_DAYS,
} from "./checkin";

const DAY = 86_400_000;
const NOW = new Date("2026-08-26T12:00:00Z").getTime(); // a Wednesday

describe("checkinPeriod", () => {
  /*
   * Ends on the CURRENT week, not last week. Rent is due on a named day, so by
   * mid-week the current week is knowable — and an owner asked only about last
   * week has to come back for this one.
   */
  it("covers this week and last on a fortnightly cadence", () => {
    expect(checkinPeriod(14, "2026-08-26")).toEqual({ start: "2026-08-17", end: "2026-08-24" });
  });

  it("covers one week on a weekly cadence", () => {
    expect(checkinPeriod(7, "2026-08-26")).toEqual({ start: "2026-08-24", end: "2026-08-24" });
  });

  it("scales to a monthly cadence without a second setting", () => {
    expect(checkinPeriod(28, "2026-08-26")).toEqual({ start: "2026-08-03", end: "2026-08-24" });
  });
});

describe("outstandingWeeks", () => {
  const period = { start: "2026-08-17", end: "2026-08-24" };

  it("returns every week when nothing is recorded, newest first", () => {
    expect(outstandingWeeks(period, [])).toEqual(["2026-08-24", "2026-08-17"]);
  });

  it("drops weeks already answered", () => {
    expect(outstandingWeeks(period, ["2026-08-24"])).toEqual(["2026-08-17"]);
  });

  it("is empty when the period is fully answered", () => {
    expect(outstandingWeeks(period, ["2026-08-17", "2026-08-24"])).toEqual([]);
  });
});

describe("isStale", () => {
  const base = { presenceAskedAt: null, startedAt: null, createdAt: new Date(NOW).toISOString() };

  it("is false for a brand-new roster row", () => {
    expect(isStale({ ...base, lastReportedAt: null }, NOW)).toBe(false);
  });

  it("is false while payments are still coming in", () => {
    const recent = new Date(NOW - 5 * DAY).toISOString();
    expect(isStale({ ...base, lastReportedAt: recent }, NOW)).toBe(false);
  });

  it(`is true after ${STALE_AFTER_DAYS} days of silence`, () => {
    const old = new Date(NOW - (STALE_AFTER_DAYS + 1) * DAY).toISOString();
    expect(isStale({ ...base, lastReportedAt: old }, NOW)).toBe(true);
  });

  /*
   * The rate limit, and the reason it exists: an owner who ignores the prompt
   * must not be asked again every fortnight forever. Noise is what makes the
   * whole check-in get ignored.
   */
  it("does not re-ask somebody asked recently", () => {
    const old = new Date(NOW - 200 * DAY).toISOString();
    const askedRecently = new Date(NOW - 3 * DAY).toISOString();
    expect(isStale({ ...base, lastReportedAt: old, presenceAskedAt: askedRecently }, NOW)).toBe(false);
  });

  it("asks again once the rate limit itself has aged out", () => {
    const old = new Date(NOW - 200 * DAY).toISOString();
    const askedLongAgo = new Date(NOW - (STALE_AFTER_DAYS + 1) * DAY).toISOString();
    expect(isStale({ ...base, lastReportedAt: old, presenceAskedAt: askedLongAgo }, NOW)).toBe(true);
  });

  // started_at is a DATE ("2026-01-05"), not a timestamp. Parsing it without
  // an explicit Z is a local-midnight bug in a file that is otherwise all UTC.
  it("falls back to a date-only started_at without NaN", () => {
    expect(isStale({ ...base, lastReportedAt: null, startedAt: "2026-01-05" }, NOW)).toBe(true);
  });
});

describe("messages", () => {
  it("keeps the SMS inside two segments", () => {
    const sms = checkinSms("Northside Barber Co.", "https://shearquery.com/credit-report/checkin/" + "x".repeat(27), 4);
    expect(sms.length).toBeLessThanOrEqual(320);
    expect(sms).toMatch(/reply stop/i);
    expect(sms).toContain("4 people");
  });

  it("says 1 person rather than 1 people", () => {
    expect(checkinSms("Shop", "https://x", 1)).toContain("1 person");
  });

  it("mentions the quiet barbers by name in the email when there are any", () => {
    const html = checkinEmailHtml({
      shopName: "Northside", url: "https://x", workerCount: 3,
      period: { start: "2026-08-17", end: "2026-08-24" }, staleNames: ["Ana Cruz"],
    });
    expect(html).toContain("Ana Cruz");
    expect(html).toContain(String(STALE_AFTER_DAYS));
  });

  it("omits the staleness block entirely when nobody is quiet", () => {
    const html = checkinEmailHtml({
      shopName: "Northside", url: "https://x", workerCount: 3,
      period: { start: "2026-08-17", end: "2026-08-24" }, staleNames: [],
    });
    expect(html).not.toContain("still rent a chair");
  });

  // A shop name is owner-supplied text landing in an HTML email.
  it("escapes a shop name that contains markup", () => {
    const html = checkinEmailHtml({
      shopName: '<script>alert(1)</script>', url: "https://x", workerCount: 1,
      period: { start: "2026-08-24", end: "2026-08-24" }, staleNames: [],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
