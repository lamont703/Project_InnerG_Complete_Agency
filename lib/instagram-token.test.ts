import { describe, it, expect } from "vitest";
import { tokenType, needsRefresh, isExpired, refreshInstagramToken, REFRESH_WHEN_DAYS_LEFT } from "./instagram-token";

const days = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

describe("telling the two APIs apart", () => {
  it("recognises an Instagram Login token", () => {
    // The real stored token began IGAA and 184 characters long.
    expect(tokenType("IGAAQ" + "x".repeat(179))).toBe("instagram_login");
  });

  it("treats anything else as Facebook Login", () => {
    expect(tokenType("EAAG" + "x".repeat(100))).toBe("facebook_login");
  });
});

describe("when to refresh", () => {
  it("refreshes inside the cushion", () => {
    expect(needsRefresh(days(REFRESH_WHEN_DAYS_LEFT - 1))).toBe(true);
  });

  it("leaves a healthy token alone", () => {
    expect(needsRefresh(days(REFRESH_WHEN_DAYS_LEFT + 5))).toBe(false);
  });

  it("treats an unknown expiry as a reason to refresh, not to wait", () => {
    expect(needsRefresh(null)).toBe(true);
  });

  it("knows a dead token from a dying one", () => {
    expect(isExpired(days(-1))).toBe(true);
    expect(isExpired(days(1))).toBe(false);
  });
});

describe("refusing calls that cannot succeed", () => {
  it("will not try to refresh a Facebook Login token", async () => {
    const r = await refreshInstagramToken("EAAGsomething");
    expect(r.ok).toBe(false);
    expect(r.terminal).toBe(true);
    expect(r.error).toMatch(/not an Instagram Login token/i);
  });

  it("reports a missing token as terminal", async () => {
    const r = await refreshInstagramToken("");
    expect(r.terminal).toBe(true);
  });
});
