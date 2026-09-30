import { describe, it, expect } from "vitest";
import { hypeEmail, hypeSms, campaignEmail, CAMPAIGN } from "./messages";
import { STEPS, CAMPAIGN_WEEKS } from "./schedule";

const MEET = "https://meet.google.com/abc-defg-hij";
const input = { firstName: "Jordan", sessionDate: "2026-10-05", meetUrl: MEET, unsubscribeUrl: "https://shearquery.com/unsubscribe?t=x", mailingAddress: "123 Main St, Atlanta, GA" };

describe("the hype sequence", () => {
  it("never sends the Meet link before the 24-hour mark", () => {
    for (const s of STEPS) {
      const hasLink = hypeEmail(s.id, input).html.includes(MEET) || (hypeSms(s.id, input) ?? "").includes(MEET);
      expect(hasLink, s.id).toBe(s.withLink);
    }
  });
  it("sends a text for every step marked sms, each with the opt-out", () => {
    for (const s of STEPS.filter((x) => x.sms)) {
      const t = hypeSms(s.id, input)!;
      expect(t, s.id).toContain("Reply STOP");
      expect(t.length, s.id).toBeLessThanOrEqual(320);
    }
  });
  it("puts an unsubscribe link in every email", () => {
    for (const s of STEPS) expect(hypeEmail(s.id, input).html, s.id).toContain("Unsubscribe");
  });
  it("keeps the gift a surprise", () => {
    for (const s of STEPS) expect(hypeEmail(s.id, input).html.toLowerCase()).not.toMatch(/free month|discount|% off/);
  });
});

describe("the 12-week campaign", () => {
  it("has one email per week", () => {
    expect(CAMPAIGN).toHaveLength(CAMPAIGN_WEEKS);
    expect(new Set(CAMPAIGN.map((w) => w.subject)).size).toBe(CAMPAIGN_WEEKS);
  });
  it("carries the mailing address, unsubscribe and a tracked register link", () => {
    for (let w = 1; w <= CAMPAIGN_WEEKS; w++) {
      const e = campaignEmail(w, { ...input, mailingAddress: input.mailingAddress });
      expect(e.html).toContain("123 Main St");
      expect(e.html).toContain("Unsubscribe");
      expect(e.html).toContain(`/live-training?src=email_w${w}`);
    }
  });
  it("never calls a feature in testing available — booking and payments say so", () => {
    for (const w of [4, 5, 6]) expect(CAMPAIGN[w - 1].paragraphs.join(" ")).toMatch(/in testing/);
  });
  it("doesn't put numbers in the copy that nobody measured", () => {
    for (const w of CAMPAIGN) expect(w.paragraphs.join(" ")).not.toMatch(/\d+\s?%/);
  });
});
