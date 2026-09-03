import { describe, expect, it } from "vitest";
import { mintNonce, verifyConsent, overDailyLimit, DAILY_MAX_RENDERS } from "@/lib/video-agent/consent";

const live = (code: string) => ({
  consent_nonce: code,
  consent_nonce_expires_at: new Date(Date.now() + 60_000).toISOString(),
  consent_nonce_consumed_at: null,
});

describe("consent is the nonce, not the sender", () => {
  it("accepts the code when the human typed it", () => {
    expect(verifyConsent(live("123456"), "yes go ahead, 123456").ok).toBe(true);
  });

  /*
   * THE ONE THAT MATTERS. Most mail clients quote the proposal underneath the
   * reply, and the proposal contains the code. A loose "body contains the
   * digits" test therefore approves a reply that says the opposite — including
   * "no, don't render this". Only the text above the quote counts.
   */
  it("refuses when the code appears only in the quoted proposal", () => {
    const reply = [
      "no, do not render this one",
      "",
      "On Wed, Sep 3 2026 at 09:12, ShearQuery wrote:",
      "> reply with 123456 to approve",
    ].join("\n");
    expect(verifyConsent(live("123456"), reply)).toEqual({ ok: false, reason: "no-code-in-reply" });
  });

  it("refuses a wrong code, an expired one, and one already spent", () => {
    // The union narrows on ok, so assert the whole verdict rather than reaching
    // for .reason on a type that may not carry one.
    expect(verifyConsent(live("123456"), "654321")).toEqual({ ok: false, reason: "wrong-code" });
    expect(verifyConsent({ ...live("123456"), consent_nonce_expires_at: new Date(Date.now() - 1).toISOString() }, "123456"))
      .toEqual({ ok: false, reason: "expired" });
    expect(verifyConsent({ ...live("123456"), consent_nonce_consumed_at: new Date().toISOString() }, "123456"))
      .toEqual({ ok: false, reason: "already-used" });
  });

  it("mints six typeable digits with a real expiry", () => {
    const { code, expiresAt } = mintNonce();
    expect(code).toMatch(/^\d{6}$/);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("the daily ceiling refuses rather than queues", () => {
  it("stops on render count before money", () => {
    const v = overDailyLimit({ renders: DAILY_MAX_RENDERS, usd: 0 }, 0.5);
    expect(v.over).toBe(true);
  });

  it("stops when this job would cross the dollar cap", () => {
    expect(overDailyLimit({ renders: 1, usd: 4.6 }, 0.9).over).toBe(true);
    expect(overDailyLimit({ renders: 1, usd: 4.0 }, 0.9).over).toBe(false);
  });

  /* A single job can never outrun the per-video gate either. */
  it("stops a single job over the per-video cap even on a quiet day", () => {
    expect(overDailyLimit({ renders: 0, usd: 0 }, 1.9).over).toBe(true);
  });
});

describe("which gate refused, and what to do about it", () => {
  it("names the per-video gate rather than calling it a daily limit", () => {
    // The real case: 0 renders today, one script at $1.89 against a $1.50 cap.
    const v = overDailyLimit({ renders: 0, usd: 0 }, 1.89);
    expect(v.over).toBe(true);
    if (!v.over) return;
    expect(v.gate).toBe("per-video");
    expect(v.reason).toMatch(/NOT the daily limit/);
    expect(v.reason).toMatch(/too much time on camera/);
  });

  it("says how many seconds and words to move out of an avatar beat", () => {
    const v = overDailyLimit({ renders: 0, usd: 0 }, 1.89);
    if (!v.over) throw new Error("expected a refusal");
    // ($1.89 - $1.50) / $0.0386 per second ~= 11s, ~33 words at 175 wpm.
    expect(v.reason).toMatch(/\b1[01]s too much/);
    expect(v.reason).toMatch(/roughly 3[0-9] words/);
  });

  it("still reports the daily gates as daily when they are what bit", () => {
    const byCount = overDailyLimit({ renders: 3, usd: 0 }, 1.0);
    const bySpend = overDailyLimit({ renders: 1, usd: 4.8 }, 1.0);
    if (!byCount.over || !bySpend.over) throw new Error("expected refusals");
    expect(byCount.gate).toBe("renders");
    expect(bySpend.gate).toBe("spend");
  });
});
