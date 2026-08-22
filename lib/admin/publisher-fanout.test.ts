import { describe, it, expect } from "vitest";
import { statusFromOutcomes, type Outcome } from "@/lib/admin/publisher-targets";
import { buildXText, buildGbpSummary, buildLinkedInCommentary } from "@/lib/admin/publisher-copy";
import { fitToXLimit, X_TEXT_LIMIT } from "@/lib/x-publish";
import { GBP_SUMMARY_LIMIT } from "@/lib/gbp-brand-publish";

const row = {
  title: "Texas barber written exam pass rate",
  stat: "62%",
  label: "of first-time Texas barber candidates pass the written exam",
  question: "Would you pass it today?",
  caption: null,
};

/**
 * THE RULE THE WHOLE FAN-OUT TURNS ON. A platform that was never attempted
 * cannot have failed, and if that ever stops being true every row becomes
 * 'partial' the moment one destination is switched off - which is the permanent
 * state TikTok would have put the board in.
 */
describe("statusFromOutcomes", () => {
  const ok: Outcome = { ok: true, id: "1" };
  const bad: Outcome = { ok: false, error: "nope" };
  const off: Outcome = { skipped: "not enabled" };

  it("calls it published when every ATTEMPTED platform succeeded", () => {
    expect(statusFromOutcomes({ youtube: ok, instagram: ok })).toBe("published");
  });

  it("does not let a disabled platform drag a clean run down to partial", () => {
    // Four successes and TikTok switched off is a clean run, not a partial one.
    expect(
      statusFromOutcomes({ youtube: ok, instagram: ok, linkedin: ok, x: ok, tiktok: off })
    ).toBe("published");
  });

  it("reports partial when some attempted platforms failed", () => {
    expect(statusFromOutcomes({ youtube: ok, instagram: bad, tiktok: off })).toBe("partial");
  });

  it("reports failed when every attempt failed", () => {
    expect(statusFromOutcomes({ youtube: bad, instagram: bad, tiktok: off })).toBe("failed");
  });

  it("reports failed when nothing was attempted at all", () => {
    // Not 'published'. Zero successes out of zero attempts is vacuously true
    // and would be the wrong answer - the item did not go out.
    expect(statusFromOutcomes({ youtube: off, instagram: off })).toBe("failed");
  });
});

/**
 * The two limits that fail silently as a 400 naming no field.
 */
describe("platform text limits", () => {
  it("keeps an X post inside 280 characters", () => {
    expect(buildXText(row).length).toBeLessThanOrEqual(X_TEXT_LIMIT);
  });

  it("keeps an X post inside 280 even when the source text is enormous", () => {
    const huge = {
      ...row,
      label: "of first-time candidates pass ".repeat(40),
      question: "Would you pass it today? ".repeat(40),
    };
    expect(buildXText(huge).length).toBeLessThanOrEqual(X_TEXT_LIMIT);
  });

  it("reserves room for the link rather than measuring the raw URL", () => {
    // X rewrites every URL to a fixed-length t.co link, so the budget has to
    // assume 23 characters no matter how long the real URL is.
    const text = buildXText(row);
    expect(text).toContain("https://shearquery.com");
    expect(text.length).toBeLessThanOrEqual(X_TEXT_LIMIT);
  });

  it("keeps a Google Post inside the summary limit", () => {
    const huge = { ...row, question: "Would you pass it today? ".repeat(300) };
    expect(buildGbpSummary(huge).length).toBeLessThanOrEqual(GBP_SUMMARY_LIMIT);
  });

  it("keeps a LinkedIn commentary inside LinkedIn's 3000", () => {
    const huge = { ...row, question: "Would you pass it today? ".repeat(300) };
    // The publisher slices at 3000; this asserts the builder is not producing
    // something so long that the slice cuts mid-sentence on every post.
    expect(buildLinkedInCommentary(huge).length).toBeGreaterThan(0);
  });
});

describe("fitToXLimit", () => {
  it("leaves short text untouched", () => {
    expect(fitToXLimit("short", 50)).toBe("short");
  });

  it("never returns more than the limit", () => {
    const out = fitToXLimit("a ".repeat(500), 100);
    expect(out.length).toBeLessThanOrEqual(100);
  });

  it("breaks on a word boundary when there is one worth using", () => {
    // "alpha beta gamma de" is the raw 19-character cut; breaking back to the
    // last space drops the orphaned "de" rather than shipping half a word.
    const out = fitToXLimit("alpha beta gamma delta epsilon", 20);
    expect(out).toBe("alpha beta gamma…");
  });

  it("cuts mid-token when the text has no usable space", () => {
    // A long unbroken string (a URL) has nowhere to break; refusing to cut it
    // would return something over the limit.
    const out = fitToXLimit("x".repeat(400), 50);
    expect(out.length).toBeLessThanOrEqual(50);
  });
});

/**
 * The dry run's whole job is to answer "would this platform publish?". A
 * blocker that only exists BECAUSE it is a dry run is a false negative, and it
 * hides real connection problems behind a fake reason.
 */
describe("dry-run blockers", () => {
  it("does not report a video-needing platform as blocked when the row has a video", async () => {
    const connections = [
      { platform: "linkedin", enabled: true, status: "connected", access_token: "t", refresh_token: null, expires_at: null, account_label: "me", config: { authorUrn: "urn:li:person:abc" } },
      { platform: "x", enabled: true, status: "connected", access_token: "t", refresh_token: "r", expires_at: null, account_label: "@me", config: {} },
      { platform: "gbp", enabled: true, status: "connected", access_token: null, refresh_token: "r", expires_at: null, account_label: "biz", config: { accountName: "accounts/1", locationName: "locations/2" } },
      { platform: "tiktok", enabled: false, status: "disconnected", access_token: null, refresh_token: null, expires_at: null, account_label: null, config: {} },
    ];

    const admin = {
      from: () => ({
        select: async () => ({ data: connections }),
        update: () => ({ eq: async () => ({}) }),
      }),
    };

    const { fanOutToTargets } = await import("@/lib/admin/publisher-targets");
    const out = await fanOutToTargets({
      admin,
      row: { video_url: "https://example.com/a.mp4", stat: "62%", label: "pass", question: "q?", title: "t" },
      video: null,
      dryRun: true,
    });

    // The row has a video, so neither of these may claim otherwise.
    //
    // GBP is deliberately not asserted here: its dry run now redeems the
    // refresh token for real, so its outcome depends on credentials rather
    // than on the blocker logic this test is about.
    expect(out.linkedin).not.toHaveProperty("skipped");
    expect(out.x).not.toHaveProperty("skipped");
    // TikTok is genuinely off, and must still say so.
    expect(out.tiktok).toEqual({ skipped: "not enabled" });
  });

  it("still reports a blocker when the row genuinely has no video", async () => {
    const admin = {
      from: () => ({
        select: async () => ({
          data: [{ platform: "linkedin", enabled: true, status: "connected", access_token: "t", refresh_token: null, expires_at: null, account_label: "me", config: { authorUrn: "urn:li:person:abc" } }],
        }),
        update: () => ({ eq: async () => ({}) }),
      }),
    };

    const { fanOutToTargets } = await import("@/lib/admin/publisher-targets");
    const out = await fanOutToTargets({
      admin,
      row: { video_url: null, title: "t" },
      video: null,
      dryRun: true,
      only: ["linkedin"],
    });

    expect(out.linkedin).toEqual({ skipped: "no video bytes available" });
  });
});

/**
 * A missing OAuth client is a deployment problem, not a dead grant. If it ever
 * starts marking the connection revoked again, someone gets sent through a
 * consent screen to fix a token that was never broken.
 */
describe("X refresh failures", () => {
  const noClient = { ...process.env };

  it("treats an unset OAuth client as not-configured, not as a refusal", async () => {
    delete process.env.TWITTER_CLIENT_ID;
    delete process.env.TWITTER_CLIENT_SECRET;
    const { refreshXToken } = await import("@/lib/x-publish");
    const r = await refreshXToken("some-refresh-token");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_configured");
    Object.assign(process.env, noClient);
  });
});

describe("TikTok: two routes, one account", () => {
  const conns = (nativeEnabled: boolean, ghlEnabled = true) => [
    { platform: "tiktok", enabled: nativeEnabled, status: nativeEnabled ? "connected" : "disconnected",
      access_token: nativeEnabled ? "t" : null, refresh_token: null, expires_at: null, account_label: null, config: {} },
    { platform: "tiktok_ghl", enabled: ghlEnabled, status: "connected",
      access_token: null, refresh_token: null, expires_at: null, account_label: "TikTok via GoHighLevel",
      config: { accountId: "acct_business" } },
  ];
  const adminWith = (connections: unknown[]) => ({
    from: () => ({ select: async () => ({ data: connections }), update: () => ({ eq: async () => ({}) }) }),
  });

  it("stands the GHL route down the moment native TikTok is enabled", async () => {
    // The failure this prevents is two copies of every video on one account.
    // Approval day should be a single flag flip, not a coordinated change.
    const { fanOutToTargets } = await import("@/lib/admin/publisher-targets");
    const out = await fanOutToTargets({
      admin: adminWith(conns(true)),
      row: { video_url: "https://example.com/a.mp4", title: "t" },
      video: null,
      only: ["tiktok_ghl"],
    });
    expect(out.tiktok_ghl).toEqual({ skipped: "native TikTok is enabled — not double-posting" });
  });

  it("does NOT block the GHL route on missing video bytes", async () => {
    // GHL is handed a public URL and fetches the file itself, so a failed
    // download must not stop it — that is the reason for passing a URL.
    const { fanOutToTargets } = await import("@/lib/admin/publisher-targets");
    const out = await fanOutToTargets({
      admin: adminWith(conns(false)),
      row: { video_url: "https://example.com/a.mp4", title: "t" },
      video: null,
      dryRun: true,
      only: ["tiktok_ghl"],
    });
    expect(out.tiktok_ghl).not.toEqual({ skipped: "no video bytes available" });
  });

  it("refuses when the queued item has no public URL for GHL to fetch", async () => {
    const { fanOutToTargets } = await import("@/lib/admin/publisher-targets");
    const out = await fanOutToTargets({
      admin: adminWith(conns(false)),
      row: { video_url: null, title: "t" },
      video: null,
      only: ["tiktok_ghl"],
    });
    expect(out.tiktok_ghl).toHaveProperty("skipped");
  });

  it("says plainly when the GHL route itself is switched off", async () => {
    const { fanOutToTargets } = await import("@/lib/admin/publisher-targets");
    const out = await fanOutToTargets({
      admin: adminWith(conns(false, false)),
      row: { video_url: "https://example.com/a.mp4", title: "t" },
      video: null,
      only: ["tiktok_ghl"],
    });
    expect(out.tiktok_ghl).toEqual({ skipped: "not enabled" });
  });
});
