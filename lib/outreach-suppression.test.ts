import { describe, it, expect, beforeAll } from "vitest";
import {
  signUnsubscribeToken, verifyUnsubscribeToken, unsubscribeUrl, normaliseEmail, suppressedSet,
} from "./outreach-suppression";

beforeAll(() => { process.env.OUTREACH_TOKEN_SECRET = "test-secret-value"; });

describe("the token", () => {
  it("round-trips the address", () => {
    expect(verifyUnsubscribeToken(signUnsubscribeToken("Info@School.com"))).toBe("info@school.com");
  });

  it("keeps the address out of the URL even to someone who decodes it", () => {
    // The first version base64url-encoded the address, which any reader of a
    // server log could reverse in one command. Encryption is the difference
    // between the comment being true and being decorative.
    // Run it repeatedly: the IV is random, so a single pass proves nothing about
    // the next token. (An earlier version of this test asserted no "@" byte
    // appeared in the ciphertext, which fails ~13% of the time by chance —
    // 0x40 is just a byte. Assert the address is unrecoverable, not that the
    // random bytes look a particular way.)
    for (let i = 0; i < 50; i++) {
      const url = unsubscribeUrl("https://shearquery.com", "director@school.com");
      expect(url).toContain("/unsubscribe?t=");
      expect(url).not.toContain("director@school.com");
      const token = decodeURIComponent(url.split("t=")[1]);
      const decodedParts = token.split(".").map((p) => Buffer.from(p, "base64url").toString("utf8"));
      expect(decodedParts.join("")).not.toContain("director");
      expect(decodedParts.join("")).not.toContain("school.com");
    }
  });

  it("gives a different token each time, so the link is not a stable identifier", () => {
    expect(signUnsubscribeToken("a@b.com")).not.toBe(signUnsubscribeToken("a@b.com"));
  });

  it("is worthless to anyone without our key", () => {
    const token = signUnsubscribeToken("director@school.com");
    const original = process.env.OUTREACH_TOKEN_SECRET;
    process.env.OUTREACH_TOKEN_SECRET = "somebody-elses-secret";
    try {
      expect(verifyUnsubscribeToken(token)).toBeNull();
    } finally {
      process.env.OUTREACH_TOKEN_SECRET = original;
    }
  });

  it("rejects a token we did not sign — nobody unsubscribes anyone else", () => {
    const forged = [Buffer.from("victim@school.com").toString("base64url"), "ZmFrZQ", "ZmFrZXRhZw"].join(".");
    expect(verifyUnsubscribeToken(forged)).toBeNull();
  });

  it("rejects a tampered payload — GCM's auth tag catches it", () => {
    const [iv, ct, tag] = signUnsubscribeToken("a@b.com").split(".");
    const swapped = [iv, Buffer.from("c@d.com").toString("base64url"), tag].join(".");
    expect(verifyUnsubscribeToken(swapped)).toBeNull();
  });

  it("survives garbage without throwing", () => {
    for (const bad of ["", ".", "x", "a.b.c", "!!!"]) expect(verifyUnsubscribeToken(bad)).toBeNull();
  });
});

describe("normalisation", () => {
  it("collapses case and whitespace so one address cannot be listed twice", () => {
    expect(normaliseEmail("  Info@School.COM ")).toBe("info@school.com");
  });
});

describe("the send-time gate", () => {
  const client = (rows: { email: string }[] | null, error?: string) => ({
    from: () => ({ select: () => ({ in: async () => ({ data: rows, error: error ? { message: error } : null }) }) }),
  });

  it("returns the opted-out addresses, normalised", async () => {
    const s = await suppressedSet(client([{ email: "OUT@school.com" }]), ["out@school.com", "in@school.com"]);
    expect(s.has("out@school.com")).toBe(true);
    expect(s.has("in@school.com")).toBe(false);
  });

  it("FAILS CLOSED — a broken lookup stops the run rather than mailing everyone", async () => {
    await expect(suppressedSet(client(null, "connection lost"), ["a@b.com"])).rejects.toThrow(/refusing to send/i);
  });

  it("does not query at all for an empty list", async () => {
    expect((await suppressedSet(client(null, "should not be called"), [])).size).toBe(0);
  });
});
