import { describe, it, expect } from "vitest";
import { inviteMessage, inviteUrl, cooldownRemainingMs, INVITE_COOLDOWN_MS } from "./invite";

const TOKEN = "abc123token";

describe("inviteMessage", () => {
  const msg = inviteMessage("Northside Barber Co.", "Marcus Webb", TOKEN);

  /*
   * The shop's name is what separates this from a phishing text. A stranger
   * receiving "claim your payment record" with a bare link has no way to tell
   * it apart from a scam, and the correct response to a scam is to ignore it.
   */
  it("names the shop that sent it", () => {
    expect(msg).toContain("Northside Barber Co.");
  });

  it("uses their first name only", () => {
    expect(msg).toContain("Marcus");
    expect(msg).not.toContain("Marcus Webb");
  });

  it("carries the claim link with the token", () => {
    expect(msg).toContain(inviteUrl(TOKEN));
    expect(msg).toContain(TOKEN);
  });

  // Required for automated SMS to a mobile, and correct regardless.
  it("tells them how to stop", () => {
    expect(msg).toMatch(/reply stop/i);
  });

  /*
   * Says the record is theirs and private. Without it the message reads as a
   * credit check being RUN on them, which is the opposite of what this is and
   * the likeliest reason somebody would refuse to tap.
   */
  it("says the record is theirs and cannot be looked up", () => {
    expect(msg).toMatch(/only you can share/i);
    expect(msg).toMatch(/nobody can look it up/i);
  });

  /*
   * Two SMS segments. Past 320 characters carriers split the message, and the
   * split lands wherever it lands — including through the middle of the URL.
   */
  it("fits in two SMS segments", () => {
    expect(msg.length).toBeLessThanOrEqual(320);
  });

  it("degrades to a greeting rather than an empty name", () => {
    expect(inviteMessage("Shop", "   ", TOKEN)).toContain("there —");
  });
});

describe("cooldownRemainingMs", () => {
  it("is zero when nothing has been sent", () => {
    expect(cooldownRemainingMs(null)).toBe(0);
  });

  it("is zero once the window has passed", () => {
    const old = new Date(Date.now() - INVITE_COOLDOWN_MS - 1000).toISOString();
    expect(cooldownRemainingMs(old)).toBe(0);
  });

  it("counts down from a recent send", () => {
    const justNow = new Date(Date.now() - 60_000).toISOString();
    const left = cooldownRemainingMs(justNow);
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThanOrEqual(INVITE_COOLDOWN_MS - 59_000);
  });

  // Never negative — a caller doing Math.ceil(wait/60000) on a negative number
  // would render "send again in -3 min".
  it("never returns a negative wait", () => {
    const ancient = new Date(2020, 0, 1).toISOString();
    expect(cooldownRemainingMs(ancient)).toBe(0);
  });
});
