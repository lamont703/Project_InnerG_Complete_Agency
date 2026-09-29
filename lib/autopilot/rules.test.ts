import { describe, it, expect } from "vitest";
import { fallbackPost, isDigestDue, isPostDue, isReportDue, postPrompt, selectAutoReplies, validateAutoPost, type PostFacts } from "./rules";

const now = new Date("2026-10-06T16:00:00Z"); // a Tuesday
const days = (n: number) => new Date(now.getTime() - n * 86400_000).toISOString();
const review = (id: string, starRating: string, createTime: string, reply?: string) => ({
  name: `accounts/1/locations/2/reviews/${id}`, starRating, createTime, comment: "Great cut", reviewer: { displayName: "Sam K" },
  ...(reply ? { reviewReply: { comment: reply } } : {}),
});

describe("which reviews Autopilot may answer", () => {
  it("only 4 and 5 stars, unanswered, recent, never twice", () => {
    const picked = selectAutoReplies([
      review("five", "FIVE", days(1)),
      review("four", "FOUR", days(2)),
      review("three", "THREE", days(1)),
      review("one", "ONE", days(1)),
      review("answered", "FIVE", days(1), "Thanks!"),
      review("old", "FIVE", days(45)),
      review("handled", "FIVE", days(1)),
    ], new Set(["accounts/1/locations/2/reviews/handled"]), now);
    expect(picked.map((r) => r.name!.split("/").pop())).toEqual(["five", "four"]);
  });

  it("answers at most five per run", () => {
    const many = Array.from({ length: 9 }, (_, i) => review(`r${i}`, "FIVE", days(1)));
    expect(selectAutoReplies(many, new Set(), now)).toHaveLength(5);
  });
});

describe("when each job runs", () => {
  it("posts on the chosen weekday, from 15:00 UTC, once a week", () => {
    expect(isPostDue(now, 2, null)).toBe(true);
    expect(isPostDue(now, 3, null)).toBe(false);
    expect(isPostDue(new Date("2026-10-06T10:00:00Z"), 2, null)).toBe(false);
    expect(isPostDue(now, 2, days(0.1))).toBe(false);
    expect(isPostDue(now, 2, days(7))).toBe(true);
  });

  it("reports on Mondays once", () => {
    const monday = new Date("2026-10-05T15:00:00Z");
    expect(isReportDue(monday, null)).toBe(true);
    expect(isReportDue(monday, new Date("2026-10-05T14:30:00Z").toISOString())).toBe(false);
    expect(isReportDue(now, null)).toBe(false);
  });

  it("sends the digest late in the day, only with news, at most daily", () => {
    const late = new Date("2026-10-06T23:10:00Z");
    expect(isDigestDue(late, null, true)).toBe(true);
    expect(isDigestDue(late, null, false)).toBe(false);
    expect(isDigestDue(now, null, true)).toBe(false);
    expect(isDigestDue(late, new Date("2026-10-06T08:00:00Z").toISOString(), true)).toBe(false);
  });
});

const facts: PostFacts = {
  businessName: "Demo Cuts", category: "Barber shop", services: ["haircut", "beard trimming", "kids haircut"],
  hours: ["Tuesday: 9am–7pm", "Saturday: 8am–4pm"], bookingUrl: "https://example.com/book", praise: "Best fade in town", recentPosts: ["Saturday is filling up"],
};

describe("the weekly post", () => {
  it("never lets through a price, offer, link, phone, hashtag or deadline", () => {
    const base = "Stop by Demo Cuts for a fresh cut this week. Our barbers take their time with every fade and beard, and we would love to see you in the chair soon. Book a time that works for you.";
    expect(validateAutoPost(base).ok).toBe(true);
    for (const bad of [" Cuts are $25.", " 20% off.", " Get a free beard trim.", " Visit www.democuts.com.", " Call 713-555-0101.", " #fade", " This weekend only.", " Ask about our specials."]) {
      expect(validateAutoPost(base + bad).ok, bad).toBe(false);
    }
  });

  it("allows ordinary wording like 'we offer'", () => {
    expect(validateAutoPost("At Demo Cuts we offer haircuts, beard trims and kids cuts with the same care every time. Come in when it suits you and leave looking sharp. Tap Book to choose a time that works for your week.").ok).toBe(true);
  });

  it("has a fallback that always passes its own check", () => {
    expect(validateAutoPost(fallbackPost(facts))).toEqual({ ok: true });
    expect(validateAutoPost(fallbackPost({ ...facts, services: [], hours: [], bookingUrl: null, praise: null }))).toEqual({ ok: true });
  });

  it("gives the model only the profile's facts, and the rules", () => {
    const p = postPrompt(facts);
    expect(p).toContain("haircut, beard trimming, kids haircut");
    expect(p).toContain("Never invent a price, discount, offer");
    expect(p).toContain("must NOT repeat");
    expect(p).not.toContain("Sam");
  });
});
