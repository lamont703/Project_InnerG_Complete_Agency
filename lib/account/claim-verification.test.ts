import { describe, it, expect } from "vitest";
import {
  generateCode,
  hashCode,
  checkCode,
  canSend,
  expiryFrom,
  last4,
  verificationSms,
  MAX_ATTEMPTS,
  MAX_CODES_PER_DAY,
  RESEND_COOLDOWN_SECONDS,
} from "./claim-verification";

const MEMBER = "11111111-1111-1111-1111-111111111111";
const ENTITY = "22222222-2222-2222-2222-222222222222";
const OTHER_ENTITY = "33333333-3333-3333-3333-333333333333";

const record = (over: Partial<any> = {}) => ({
  code_hash: hashCode("418302", MEMBER, ENTITY),
  expires_at: "2026-08-16T12:10:00Z",
  attempts: 0,
  consumed_at: null,
  ...over,
});

const NOW = new Date("2026-08-16T12:05:00Z");

describe("generateCode", () => {
  it("is always six digits — no leading-zero loss", () => {
    for (let i = 0; i < 300; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });
});

describe("the code is bound to the claim, not just to the digits", () => {
  it("will not validate against a different listing", () => {
    // The same six digits are in flight for many claims at once. A bare hash of
    // "418302" would match every one of them.
    const outcome = checkCode("418302", record(), MEMBER, OTHER_ENTITY, NOW);
    expect(outcome).toEqual({ ok: false, reason: "wrong_code" });
  });

  it("will not validate for a different member", () => {
    const outcome = checkCode("418302", record(), "44444444-4444-4444-4444-444444444444", ENTITY, NOW);
    expect(outcome).toEqual({ ok: false, reason: "wrong_code" });
  });

  it("accepts the right code for the right claim", () => {
    expect(checkCode("418302", record(), MEMBER, ENTITY, NOW)).toEqual({ ok: true });
  });

  it("tolerates a code typed with spaces or dashes", () => {
    expect(checkCode("418-302", record(), MEMBER, ENTITY, NOW)).toEqual({ ok: true });
    expect(checkCode(" 418 302 ", record(), MEMBER, ENTITY, NOW)).toEqual({ ok: true });
  });
});

describe("expiry and attempts are checked BEFORE the comparison", () => {
  // Otherwise an exhausted or expired code can still be brute-forced by
  // continuing to guess against it.
  it("rejects an expired code even when the digits are right", () => {
    const r = record({ expires_at: "2026-08-16T12:00:00Z" });
    expect(checkCode("418302", r, MEMBER, ENTITY, NOW)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects once the attempt cap is hit, even when the digits are right", () => {
    const r = record({ attempts: MAX_ATTEMPTS });
    expect(checkCode("418302", r, MEMBER, ENTITY, NOW)).toEqual({ ok: false, reason: "too_many_attempts" });
  });

  it("rejects a code that was already used", () => {
    const r = record({ consumed_at: "2026-08-16T12:04:00Z" });
    expect(checkCode("418302", r, MEMBER, ENTITY, NOW)).toEqual({ ok: false, reason: "no_code" });
  });

  it("rejects when there is no code at all", () => {
    expect(checkCode("418302", null, MEMBER, ENTITY, NOW)).toEqual({ ok: false, reason: "no_code" });
  });

  it("rejects anything that is not six digits without touching the hash", () => {
    for (const junk of ["", "1234", "12345678", "abcdef", "  "]) {
      expect(checkCode(junk, record(), MEMBER, ENTITY, NOW)).toEqual({ ok: false, reason: "wrong_code" });
    }
  });
});

describe("send limits — anti-harassment, not anti-fraud", () => {
  // Without these, anyone could make us text a real business dozens of times
  // about a claim they invented. The business blocks our number, and every
  // future booking notification to that listing silently stops.
  it("allows the first code", () => {
    expect(canSend([], NOW)).toEqual({ ok: true });
  });

  it("holds a resend inside the cooldown, and says for how long", () => {
    const r = canSend([{ created_at: "2026-08-16T12:04:30Z" }], NOW); // 30s ago
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toBe("cooldown");
    expect(r.ok === false && r.retryAfterSeconds).toBe(30);
  });

  it("allows a resend once the cooldown has passed", () => {
    const past = new Date(NOW.getTime() - (RESEND_COOLDOWN_SECONDS + 5) * 1000).toISOString();
    expect(canSend([{ created_at: past }], NOW)).toEqual({ ok: true });
  });

  it("caps codes per day", () => {
    const many = Array.from({ length: MAX_CODES_PER_DAY }, (_, i) => ({
      created_at: new Date(NOW.getTime() - (i + 1) * 3600_000).toISOString(),
    }));
    expect(canSend(many, NOW)).toEqual({ ok: false, reason: "daily_cap" });
  });

  it("does not count codes older than a day toward the cap", () => {
    const old = Array.from({ length: MAX_CODES_PER_DAY }, (_, i) => ({
      created_at: new Date(NOW.getTime() - (25 + i) * 3600_000).toISOString(),
    }));
    expect(canSend(old, NOW)).toEqual({ ok: true });
  });
});

describe("supporting bits", () => {
  it("expires ten minutes out", () => {
    expect(expiryFrom(NOW).toISOString()).toBe("2026-08-16T12:15:00.000Z");
  });

  it("takes the last four digits of any phone format", () => {
    expect(last4("+1 (713) 555-0134")).toBe("0134");
    expect(last4("7135550134")).toBe("0134");
    expect(last4("12")).toBeNull();
    expect(last4(null)).toBeNull();
  });

  it("names us and tells an unrelated recipient to ignore it", () => {
    const msg = verificationSms("418302", "Maggy's Hair Salon");
    expect(msg).toContain("ShearQuery");
    expect(msg).toContain("Maggy's Hair Salon");
    expect(msg).toContain("418302");
    expect(msg.toLowerCase()).toContain("ignore");
  });
});
