import { describe, it, expect } from "vitest";
import { isoDay, collectionWindow, collectLinkedIn } from "./content-metrics";

describe("isoDay", () => {
  it("formats UTC yyyy-mm-dd", () => {
    expect(isoDay(new Date("2026-08-19T23:59:59Z"))).toBe("2026-08-19");
  });
});

describe("collectionWindow", () => {
  /*
   * The window is deliberately wider than one day. YouTube Analytics revises
   * recent days for roughly 72 hours, so a collector that only ever asked about
   * yesterday would permanently store the first and lowest number it saw. The
   * upsert key makes re-reading a correction rather than a duplicate.
   */
  it("looks back several days, not one", () => {
    const { start, end } = collectionWindow(5);
    const days = (Date.parse(end) - Date.parse(start)) / 86400000;
    expect(days).toBeGreaterThanOrEqual(4);
  });
});

describe("collectLinkedIn", () => {
  /*
   * LinkedIn must produce a ROW, not an empty array. An empty array makes the
   * platform vanish from the page, which reads as "posted nothing" instead of
   * "cannot be measured" — the single most misleading failure a metrics
   * dashboard has available to it.
   */
  it("records a reason rather than a zero", () => {
    const [row] = collectLinkedIn();
    expect(row.platform).toBe("linkedin");
    expect(row.value).toBeNull();
    expect(row.metric_kind).toBe("none");
    expect(row.unavailable_reason).toMatch(/403|ACCESS_DENIED|permission/i);
  });

  it("never reports zero, which would draw a line along the axis", () => {
    expect(collectLinkedIn()[0].value).not.toBe(0);
  });
});

describe("TikTok is read directly, not through GoHighLevel", () => {
  /*
   * The GHL reader was removed rather than kept as a fallback. It reported
   * likes/shares/comments and no view count, and publishing through GHL returns
   * {"id":"accepted"} instead of a post id — so its rows could never be joined
   * to a video or contribute a view. Keeping it would have put a permanent
   * "cannot report" row on the page beside the real TikTok numbers.
   */
  it("no longer exports a GoHighLevel metrics collector", async () => {
    const mod = await import("./content-metrics");
    expect("collectTikTokGhl" in mod).toBe(false);
    expect(typeof (mod as any).collectTikTok).toBe("function");
  });
});
