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
