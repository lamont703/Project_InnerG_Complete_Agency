// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  normalizePhone, memberTags, upsertGhlContact, isTestContact,
  addGhlTags, TAG_AUDIT_RUN, TAG_GOOGLE_CONNECTED,
} from "./ghl-contacts";

describe("normalizePhone", () => {
  it("converts the shapes a signup form actually produces", () => {
    for (const raw of ["7135550199", "(713) 555-0199", "713-555-0199", "713.555.0199", " 713 555 0199 "]) {
      expect(normalizePhone(raw), raw).toBe("+17135550199");
    }
  });

  it("keeps an 11-digit US number with its country code", () => {
    expect(normalizePhone("17135550199")).toBe("+17135550199");
    expect(normalizePhone("+1 713 555 0199")).toBe("+17135550199");
  });

  it("returns null rather than guessing at something malformed", () => {
    // GHL rejects the WHOLE upsert on a bad number, so a wrong guess loses the
    // contact entirely. Dropping the phone is the cheaper failure.
    for (const raw of ["", "555-0199", "abc", "+0123456789", "12345"]) {
      expect(normalizePhone(raw), raw).toBeNull();
    }
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});

describe("memberTags", () => {
  it("always identifies the member and their source table", () => {
    expect(memberTags({})).toEqual(["Community Member", "Table: community_members"]);
  });

  it("records a claim only when the link actually succeeded", () => {
    expect(memberTags({ claimedEntityType: "shop", claimLinked: true })).toContain("Claimed: shop");
    // The signup can succeed with the link failing; tagging it as claimed then
    // would put a lie in the CRM.
    expect(memberTags({ claimedEntityType: "shop", claimLinked: false })).not.toContain("Claimed: shop");
  });
});

describe("upsertGhlContact", () => {
  const OLD = { ...process.env };
  let fetchMock: any;

  beforeEach(() => {
    process.env.GHL_API_KEY = "test-key";
    process.env.GHL_LOCATION_ID = "loc-1";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    process.env = { ...OLD };
    vi.unstubAllGlobals();
  });

  const ok = (body: any) => ({ ok: true, status: 200, json: async () => body, text: async () => "" });

  it("never sends tags on the upsert", async () => {
    // The bug this guards: GHL's upsert REPLACES tags, so a member who is also
    // a directory entity would lose their table/city/type tags on signup.
    fetchMock.mockResolvedValueOnce(ok({ contact: { id: "c1" }, new: true })).mockResolvedValueOnce(ok({}));

    await upsertGhlContact({ firstName: "A", lastName: "B", email: "a@b.com", phone: "7132240199", tags: ["X"] });

    const upsertBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(upsertBody.tags).toBeUndefined();
  });

  it("applies tags in a second, additive call", async () => {
    fetchMock.mockResolvedValueOnce(ok({ contact: { id: "c1" }, new: true })).mockResolvedValueOnce(ok({}));

    const r = await upsertGhlContact({ email: "a@b.com", tags: ["Community Member"] });

    expect(fetchMock.mock.calls[1][0]).toContain("/contacts/c1/tags");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ tags: ["Community Member"] });
    expect(r).toMatchObject({ ok: true, contactId: "c1", isNew: true, tagged: true });
  });

  it("still reports success when only the tag call fails", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ contact: { id: "c1" } }))
      .mockResolvedValue({ ok: false, status: 400, text: async () => "bad" });

    const r = await upsertGhlContact({ email: "a@b.com", tags: ["X"] });
    expect(r.ok).toBe(true);
    expect(r.contactId).toBe("c1");
    expect(r.tagged).toBe(false);
  });

  it("normalizes the phone before sending it", async () => {
    fetchMock.mockResolvedValueOnce(ok({ contact: { id: "c1" } }));
    await upsertGhlContact({ email: "a@b.com", phone: "(713) 224-0199" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).phone).toBe("+17132240199");
  });

  it("omits an unusable phone rather than failing the whole contact", async () => {
    fetchMock.mockResolvedValueOnce(ok({ contact: { id: "c1" } }));
    const r = await upsertGhlContact({ email: "a@b.com", phone: "224-0199" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).phone).toBeUndefined();
    expect(r.ok).toBe(true);
  });

  it("refuses a contact with nothing to identify it by", async () => {
    const r = await upsertGhlContact({ firstName: "A" });
    expect(r.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports missing credentials as skipped, not as an error to chase", async () => {
    delete process.env.GHL_API_KEY;
    const r = await upsertGhlContact({ email: "a@b.com" });
    expect(r).toMatchObject({ ok: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws when the network throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    const r = await upsertGhlContact({ email: "a@b.com" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/unreachable/i);
  });

  it("retries a rate limit, then gives up without throwing", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => "slow down" });
    const r = await upsertGhlContact({ email: "a@b.com" });
    expect(r.ok).toBe(false);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("does not retry a 400 — a bad payload is a real answer", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => "invalid" });
    const r = await upsertGhlContact({ email: "a@b.com" });
    expect(r.ok).toBe(false);
    expect(fetchMock.mock.calls.length).toBe(1);
  });
});

describe("isTestContact", () => {
  it("catches the accounts that shouldn't reach a CRM", () => {
    for (const c of [
      { email: "lamont@testuser.com" },
      { email: "a@example.com" },
      { email: "test+1@gmail.com" },
      { phone: "+15555555555" },
      { phone: "(713) 555-0142" }, // 555-01xx is reserved for fiction
    ]) {
      expect(isTestContact(c), JSON.stringify(c)).toBe(true);
    }
  });

  it("lets real people through", () => {
    // A false positive here silently drops a genuine lead, which is the more
    // expensive mistake — so the rule stays narrow.
    for (const c of [
      { email: "curlupanddyesalontyler@gmail.com", phone: "+19035219585" },
      { email: "contact@timberlodgeparlor.com", phone: "+16576662378" },
      { email: "info@cheverebeauty.com", phone: "+18322551845" },
      { email: "greatest@testimonials.com" }, // "test" only as a substring
      { phone: "+17135554444" }, // 555 prefix but not a reserved range
    ]) {
      expect(isTestContact(c), JSON.stringify(c)).toBe(false);
    }
  });
});

describe("addGhlTags", () => {
  const OLD = { ...process.env };
  let fetchMock: any;
  beforeEach(() => {
    process.env.GHL_API_KEY = "test-key";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { process.env = { ...OLD }; vi.unstubAllGlobals(); });

  it("posts to the additive tags endpoint, not the upsert", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}), text: async () => "" });
    await addGhlTags("c9", [TAG_AUDIT_RUN]);
    expect(fetchMock.mock.calls[0][0]).toContain("/contacts/c9/tags");
    expect(fetchMock.mock.calls[0][0]).not.toContain("upsert");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ tags: ["audit: run"] });
  });

  it("never throws when GHL is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    const r = await addGhlTags("c9", ["x"]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/unreachable/i);
  });

  it("does nothing without a contact id or tags", async () => {
    expect((await addGhlTags("", ["x"])).ok).toBe(false);
    expect((await addGhlTags("c9", [])).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("tag constants", () => {
  it("are the exact strings a GHL workflow branches on", () => {
    // These are referenced literally inside a workflow we cannot read back
    // through the API — renaming one here breaks a branch invisibly.
    expect(TAG_AUDIT_RUN).toBe("audit: run");
    expect(TAG_GOOGLE_CONNECTED).toBe("google: connected");
  });
});
