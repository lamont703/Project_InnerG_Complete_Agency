import { describe, it, expect } from "vitest";
import { isEmbedded, embedHref } from "./embed-mode";

const sp = (q: string) => new URLSearchParams(q);

describe("isEmbedded", () => {
  it("is true only for the exact flag", () => {
    expect(isEmbedded(sp("embed=1"))).toBe(true);
    expect(isEmbedded(sp("foo=bar&embed=1"))).toBe(true);
    expect(isEmbedded(sp("embed=0"))).toBe(false);
    expect(isEmbedded(sp("embed=true"))).toBe(false);
    expect(isEmbedded(sp(""))).toBe(false);
  });

  it("tolerates a missing params object", () => {
    expect(isEmbedded(null)).toBe(false);
    expect(isEmbedded(undefined)).toBe(false);
  });
});

describe("embedHref", () => {
  it("adds the flag to a plain path", () => {
    expect(embedHref("/shop/some-shop")).toBe("/shop/some-shop?embed=1");
  });

  it("appends rather than clobbering an existing query", () => {
    expect(embedHref("/schools/x?tab=rates")).toBe("/schools/x?tab=rates&embed=1");
  });

  it("keeps a hash on the end where it belongs", () => {
    expect(embedHref("/guide#kit")).toBe("/guide?embed=1#kit");
    expect(embedHref("/guide?a=b#kit")).toBe("/guide?a=b&embed=1#kit");
  });

  it("REFUSES anything not same-origin — the panel must never frame a third party", () => {
    expect(embedHref("https://evil.com")).toBeNull();
    expect(embedHref("http://example.com/x")).toBeNull();
    // Protocol-relative: "//evil.com" is an absolute URL wearing a relative coat.
    expect(embedHref("//evil.com/x")).toBeNull();
    expect(embedHref("javascript:alert(1)")).toBeNull();
    expect(embedHref("")).toBeNull();
    expect(embedHref("shop/relative")).toBeNull();
  });
});
