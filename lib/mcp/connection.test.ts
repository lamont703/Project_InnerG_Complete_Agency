import { describe, it, expect } from "vitest";
import {
  newConnectionKey,
  hashConnectionKey,
  looksLikeConnectionKey,
  displayPrefix,
  connectionUrlFor,
  redactConnectionPath,
  keyFromRequest,
} from "./connection";

/**
 * The connection key is a bearer credential that travels in a URL, so these
 * tests cover the three properties that make that survivable: it is
 * unguessable, it is only ever stored as a hash, and it never reaches a log.
 *
 * Every assertion here corresponds to a way this could fail silently. A weak
 * key still works. A key written to the log still works. A stored plaintext key
 * still works. Nothing in the running system would complain about any of them,
 * which is exactly why they are pinned here.
 */

describe("connection keys", () => {
  it("mints keys that are unique and long enough to be unguessable", () => {
    const keys = new Set(Array.from({ length: 200 }, () => newConnectionKey()));
    expect(keys.size).toBe(200);

    for (const key of keys) {
      // sq_ + 43 base64url chars = 256 bits of entropy. Shortening the body is
      // the one change to this module that would weaken it without breaking
      // anything, so the length is asserted rather than assumed.
      expect(key).toMatch(/^sq_[A-Za-z0-9_-]{43}$/);
      expect(looksLikeConnectionKey(key)).toBe(true);
    }
  });

  it("rejects anything that is not a key, rather than letting it reach the database", () => {
    for (const bad of [
      "",
      "sq_",
      "sq_tooshort",
      "not-a-key",
      // Right shape, wrong length — one character short.
      `sq_${"a".repeat(42)}`,
      // Path traversal and separators must not pass the shape check, since the
      // value arrives from a URL segment.
      `sq_${"a".repeat(40)}/../`,
      `sq_${"a".repeat(41)}?x`,
      null,
      undefined,
      42,
      {},
    ]) {
      expect(looksLikeConnectionKey(bad as unknown)).toBe(false);
    }
  });

  it("hashes stably, and differently for different keys", () => {
    const a = newConnectionKey();
    const b = newConnectionKey();

    expect(hashConnectionKey(a)).toBe(hashConnectionKey(a));
    expect(hashConnectionKey(a)).not.toBe(hashConnectionKey(b));
    // Hex sha-256. The column is looked up by equality, so the encoding has to
    // be deterministic and case-stable.
    expect(hashConnectionKey(a)).toMatch(/^[0-9a-f]{64}$/);
    // The hash must not contain the key — obvious, and the thing that makes a
    // database dump useless.
    expect(hashConnectionKey(a)).not.toContain(a.slice(4));
  });

  it("builds a connection URL the owner can paste", () => {
    const key = newConnectionKey();
    const url = connectionUrlFor(key);
    expect(url).toMatch(/^https:\/\/[^/]+\/mcp\/k\/sq_[A-Za-z0-9_-]{43}$/);
    expect(url.endsWith(key)).toBe(true);
  });

  it("shows only a prefix for display", () => {
    const key = newConnectionKey();
    const shown = displayPrefix(key);
    expect(shown).toHaveLength(10);
    expect(key.startsWith(shown)).toBe(true);
    // Ten characters of base64url is not enough to help anyone guess the
    // remaining thirty-six.
    expect(shown.length).toBeLessThan(key.length / 2);
  });
});

describe("redactConnectionPath", () => {
  it("strips the key out of a path before it can be logged", () => {
    const key = newConnectionKey();
    const redacted = redactConnectionPath(`/mcp/k/${key}`);

    expect(redacted).not.toContain(key);
    // Still distinguishes one owner's traffic from another's.
    expect(redacted).toBe(`/mcp/k/${displayPrefix(key)}…`);
  });

  it("leaves a path with no key alone", () => {
    expect(redactConnectionPath("/mcp")).toBe("/mcp");
    expect(redactConnectionPath("/mcp/k/")).toBe("/mcp/k/");
  });

  it("redacts a partial or malformed key too", () => {
    // A truncated key is still a secret fragment, and a 401 path is exactly
    // where malformed values show up.
    const partial = "sq_abcdefghijklmnop";
    expect(redactConnectionPath(`/mcp/k/${partial}`)).toBe("/mcp/k/sq_abcdefg…");
    expect(redactConnectionPath(`/mcp/k/${partial}`)).not.toContain(partial);
  });
});

describe("keyFromRequest", () => {
  const key = newConnectionKey();

  it("takes the key from the path", () => {
    expect(keyFromRequest({ pathKey: key })).toBe(key);
  });

  it("accepts a bearer header, for clients that can send one", () => {
    expect(keyFromRequest({ authorization: `Bearer ${key}` })).toBe(key);
    expect(keyFromRequest({ authorization: `bearer ${key}` })).toBe(key);
  });

  it("prefers the path when both are present", () => {
    const other = newConnectionKey();
    expect(keyFromRequest({ pathKey: key, authorization: `Bearer ${other}` })).toBe(key);
  });

  it("returns null for anything unusable", () => {
    expect(keyFromRequest({})).toBeNull();
    expect(keyFromRequest({ pathKey: "", authorization: "" })).toBeNull();
    expect(keyFromRequest({ pathKey: "nonsense" })).toBeNull();
    expect(keyFromRequest({ authorization: key })).toBeNull(); // no Bearer scheme
    expect(keyFromRequest({ authorization: "Basic abc" })).toBeNull();
  });
});
