import { describe, expect, it, vi } from "vitest";
import core from "./retry.js";
const { withRetry, isTransient, isExhausted } = core;

describe("classification", () => {
  /* The failure that killed a clicked render on the very first call. */
  it("treats a demand spike as worth waiting for", () => {
    expect(isTransient("This model is currently experiencing high demand")).toBe(true);
    expect(isTransient("rate limit exceeded")).toBe(true);
  });

  /*
   * A spent daily allowance does not clear on a backoff timescale. Retrying it
   * wastes half a minute and then fails anyway, reading as a flaky network
   * rather than an exhausted budget.
   */
  it("does not treat an exhausted quota as transient", () => {
    const msg = "You exceeded your current quota, please check your plan and billing details";
    expect(isExhausted(msg)).toBe(true);
    expect(isTransient(msg)).toBe(false);
  });

  it("treats an ordinary error as neither", () => {
    expect(isTransient("API key not valid")).toBe(false);
    expect(isExhausted("API key not valid")).toBe(false);
  });
});

describe("withRetry", () => {
  it("returns the first success without waiting", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    expect(await withRetry(fn)).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a spike and succeeds on a later attempt", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("model is experiencing high demand"))
      .mockResolvedValue("ok");
    expect(await withRetry(fn, { waitMs: 1 })).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("gives up after the last attempt", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("high demand"));
    await expect(withRetry(fn, { tries: 3, waitMs: 1 })).rejects.toThrow(/high demand/);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("fails an exhausted quota immediately, without burning the attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("You exceeded your current quota"));
    await expect(withRetry(fn, { tries: 4, waitMs: 1 })).rejects.toThrow(/will not help/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry an error that will fail the same way every time", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("API key not valid"));
    await expect(withRetry(fn, { waitMs: 1 })).rejects.toThrow(/API key/);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("reports each wait so a long pause is not silent", async () => {
    const onWait = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("high demand"))
      .mockResolvedValue("ok");
    await withRetry(fn, { waitMs: 1, onWait });
    expect(onWait).toHaveBeenCalledWith(1, 1);
  });
});
