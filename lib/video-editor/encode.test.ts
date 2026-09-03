import { describe, expect, it } from "vitest";
import core from "./encode.js";
const { fitBitrate, fitsAtAll } = core;

describe("fitBitrate", () => {
  /*
   * The real case: a 41.3s edited avatar. At the old fixed 1100k it came out
   * 6.02MB and the upload was refused after HeyGen had been paid.
   */
  it("fits a 41s edited short inside the 5MB bucket", () => {
    const kbps = fitBitrate({ seconds: 41.3 });
    expect(kbps).toBeGreaterThan(600);
    expect(kbps).toBeLessThan(900);
    // The whole point: budget x duration must land under the ceiling.
    const megabytes = ((kbps + 96) * 41.3) / 8 / 1024;
    expect(megabytes).toBeLessThan(5);
  });

  it("gives a short clip more bitrate than a long one", () => {
    expect(fitBitrate({ seconds: 10 })).toBeGreaterThan(fitBitrate({ seconds: 40 }));
  });

  /* Aiming at exactly the limit lands over it: x264 tracks an average. */
  it("leaves headroom rather than aiming at the ceiling", () => {
    const exact = ((5 * 1024 * 8) / 30) - 96;
    expect(fitBitrate({ seconds: 30 })).toBeLessThan(exact);
  });

  it("refuses to return an unwatchable bitrate", () => {
    expect(fitBitrate({ seconds: 600 })).toBe(300);
  });

  it("will not accept a nonsense duration", () => {
    expect(() => fitBitrate({ seconds: 0 })).toThrow(/positive duration/);
    expect(() => fitBitrate({ seconds: NaN })).toThrow(/positive duration/);
  });

  it("respects a different ceiling", () => {
    expect(fitBitrate({ seconds: 41.3, limitMB: 50 })).toBeGreaterThan(fitBitrate({ seconds: 41.3 }));
  });
});

describe("fitsAtAll", () => {
  /*
   * Some clips cannot fit, and saying so beats shipping something unwatchable.
   */
  it("says a normal short fits", () => {
    expect(fitsAtAll({ seconds: 41.3 })).toBe(true);
  });

  it("says a four-minute clip does not fit in 5MB", () => {
    expect(fitsAtAll({ seconds: 240 })).toBe(false);
  });
});
