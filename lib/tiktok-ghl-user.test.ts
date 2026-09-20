import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * THE POST THAT WAS LOST, AS A TEST.
 *
 * metro-spread-hyperframes published on 2026-09-13 with everything green except
 * `tiktok_ghl: { ok: false, error: "Could not resolve a GHL user to post as." }`.
 * The platform log for that request reads:
 *
 *     [tiktok-ghl] user lookup HTTP 401: {"statusCode":401,"message":"Command timed out"}
 *
 * GHL answers a timeout with a 401, so the status code points at the credential
 * and the body points at the truth. Measured the same afternoon, that endpoint
 * failed roughly one call in five. One transient failure, on a call with no
 * retry, cost a post.
 *
 * So the first test here is the incident: fail once, succeed on the retry, and
 * the publisher must never see the failure. The rest pin the thing that made
 * the incident hard to diagnose — three different causes reaching the caller as
 * one indistinguishable sentence.
 *
 * The module caches its answer, so every test resets modules. Without that the
 * second test reads the first test's user and passes for the wrong reason.
 */
const USERS = {
  users: [
    { id: "u-plain", roles: { role: "user" } },
    { id: "u-admin", roles: { role: "admin" } },
  ],
};

async function load() {
  vi.resetModules();
  return await import("./tiktok-ghl-publish");
}

describe("resolveGhlPostingUser", () => {
  beforeEach(() => {
    process.env.GHL_API_KEY = "k";
    process.env.GHL_LOCATION_ID = "loc";
    delete process.env.GHL_POSTING_USER_ID;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /* The real backoff is 600ms then 1800ms. Passing tiny waits keeps the suite
     under a second while still exercising the same retry loop. */
  const FAST = { backoffMs: [1, 1] };

  it("survives one transient failure — the incident", async () => {
    const fetchMock = vi
      .fn()
      /* 401 with a timeout body — GHL's real failure shape, not a made-up 503. */
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => '{"statusCode":401,"message":"Command timed out"}',
      })
      .mockResolvedValueOnce({ ok: true, json: async () => USERS });
    vi.stubGlobal("fetch", fetchMock);

    const { resolveGhlPostingUser } = await load();
    const r = await resolveGhlPostingUser(FAST);

    expect(r).toEqual({ ok: true, id: "u-admin" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("prefers the admin over the first user listed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => USERS }));
    const { resolveGhlPostingUser } = await load();
    expect(await resolveGhlPostingUser(FAST)).toEqual({ ok: true, id: "u-admin" });
  });

  it("gives up after three attempts and says the status it last saw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" }));
    const { resolveGhlPostingUser } = await load();
    const r = await resolveGhlPostingUser(FAST);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("3 attempts failed");
    expect(r.reason).toContain("429");
  });

  /*
   * The three causes below all produced ONE sentence before this change, which
   * is why the incident could not be diagnosed from the queue row. Each must
   * now be distinguishable from `results` alone.
   */
  it("distinguishes an empty user list from an endpoint failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ users: [] }) }));
    const { resolveGhlPostingUser } = await load();
    const r = await resolveGhlPostingUser(FAST);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("0 user(s)");
    expect(r.reason).not.toContain("HTTP");
  });

  it("distinguishes a thrown fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNRESET")));
    const { resolveGhlPostingUser } = await load();
    const r = await resolveGhlPostingUser(FAST);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("threw");
    expect(r.reason).toContain("ECONNRESET");
  });

  it("distinguishes missing credentials, and spends no request on them", async () => {
    delete process.env.GHL_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { resolveGhlPostingUser } = await load();
    const r = await resolveGhlPostingUser(FAST);

    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("are not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("honours the env pin without calling out at all", async () => {
    process.env.GHL_POSTING_USER_ID = "u-pinned";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { resolveGhlPostingUser } = await load();
    expect(await resolveGhlPostingUser(FAST)).toEqual({ ok: true, id: "u-pinned" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps findGhlPostingUserId's old shape for existing callers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => USERS }));
    const { findGhlPostingUserId } = await load();
    expect(await findGhlPostingUserId()).toBe("u-admin");
  });
});
