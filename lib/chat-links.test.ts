import { describe, it, expect } from "vitest";
import { absolutizeLinksForMessaging, OFF_WEB_TEXT_CHANNELS } from "./chat-links";
import { SITE_URL } from "./site";

const origin = SITE_URL.replace(/\/$/, "");
const links = new Set(["/shearquery-credit-report", "/shop", "/shop/afterhours-barbershop-houston-77009"]);

describe("absolutizeLinksForMessaging", () => {
  it("makes a bare path tappable", () => {
    // The reported bug: a DM ended with "/shearquery-credit-report", which is
    // text nobody can open.
    expect(absolutizeLinksForMessaging("get started at /shearquery-credit-report.", links))
      .toBe(`get started at ${origin}/shearquery-credit-report.`);
  });

  it("unwraps markdown, because brackets do not render in a DM", () => {
    expect(absolutizeLinksForMessaging("[Credit Report](/shearquery-credit-report)", links))
      .toBe(`Credit Report: ${origin}/shearquery-credit-report`);
  });

  it("LEAVES RENT QUOTES ALONE", () => {
    // The reason only known links are rewritten instead of anything after a
    // slash: this product quotes rent as "$150-300/wk" constantly, and a naive
    // path pattern turns /wk into a broken address.
    const t = "Real rents $150-300/wk, and 60/40 splits are common.";
    expect(absolutizeLinksForMessaging(t, links)).toBe(t);
  });

  it("does not rewrite a shorter path inside a longer one", () => {
    // /shop sits inside /shop/afterhours-…; rewriting it first would leave the
    // slug dangling off the end of a domain.
    const out = absolutizeLinksForMessaging("see /shop/afterhours-barbershop-houston-77009", links);
    expect(out).toBe(`see ${origin}/shop/afterhours-barbershop-houston-77009`);
  });

  it("never double-prefixes an already absolute URL", () => {
    const already = `${origin}/shearquery-credit-report`;
    expect(absolutizeLinksForMessaging(already, links)).toBe(already);
  });

  it("ignores a path that is not a known link", () => {
    // Anything the context did not vouch for stays untouched — the same
    // allowlist the markdown sanitizer uses.
    const t = "try /not-a-real-page";
    expect(absolutizeLinksForMessaging(t, links)).toBe(t);
  });
});

describe("which channels get it", () => {
  it("covers every text channel that cannot render a link", () => {
    for (const c of ["instagram_dm", "instagram_comment", "sms", "email"]) {
      expect(OFF_WEB_TEXT_CHANNELS.has(c)).toBe(true);
    }
  });

  it("leaves the website alone, where relative links work", () => {
    expect(OFF_WEB_TEXT_CHANNELS.has("web_callback")).toBe(false);
    expect(OFF_WEB_TEXT_CHANNELS.has(undefined as any)).toBe(false);
  });

  it("skips phone_call — a URL read aloud is useless either way", () => {
    expect(OFF_WEB_TEXT_CHANNELS.has("phone_call")).toBe(false);
  });
});
