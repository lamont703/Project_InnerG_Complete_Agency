import { describe, it, expect } from "vitest";
import { extractHandles, isPlausibleHandle, normaliseHandle, rejectSharedHandles } from "./social-handle-extract";

const at = (html: string) => extractHandles(html, "https://shop.example.com");

describe("finding the handle", () => {
  it("pulls a plain profile link", () => {
    const h = at('<a href="https://www.instagram.com/fadesbyluis/">Follow us</a>');
    expect(h).toEqual([{ platform: "instagram", handle: "fadesbyluis", sourceUrl: "https://shop.example.com" }]);
  });

  it("handles protocol-relative and bare links", () => {
    expect(at('<a href="//instagram.com/shopone">x</a>')[0].handle).toBe("shopone");
  });

  it("finds several platforms in one page", () => {
    const h = at(
      '<a href="https://instagram.com/theshop">i</a>' +
        '<a href="https://www.facebook.com/theshoppage">f</a>' +
        '<a href="https://www.tiktok.com/@theshoptok">t</a>'
    );
    expect(h.map((x) => x.platform).sort()).toEqual(["facebook", "instagram", "tiktok"]);
  });

  it("deduplicates a handle linked from the header and the footer", () => {
    expect(at('<a href="https://instagram.com/same">a</a><a href="https://instagram.com/same">b</a>')).toHaveLength(1);
  });
});

describe("things that look like handles and are not", () => {
  it("rejects posts, reels and stories", () => {
    expect(at('<a href="https://www.instagram.com/p/Cx1y2z3/">post</a>')).toHaveLength(0);
    expect(at('<a href="https://www.instagram.com/reel/abc123/">reel</a>')).toHaveLength(0);
    expect(at('<a href="https://www.instagram.com/stories/whoever/">s</a>')).toHaveLength(0);
  });

  it("rejects hashtag and explore links", () => {
    expect(at('<a href="https://www.instagram.com/explore/tags/barber/">#barber</a>')).toHaveLength(0);
  });

  it("rejects the login page a plugin links to", () => {
    expect(at('<a href="https://www.instagram.com/accounts/login/">login</a>')).toHaveLength(0);
  });

  it("rejects the platform's own account from a share widget", () => {
    expect(at('<a href="https://instagram.com/instagram">ig</a>')).toHaveLength(0);
    expect(at('<a href="https://facebook.com/facebook">fb</a>')).toHaveLength(0);
  });

  it("rejects facebook share and intent URLs", () => {
    expect(at('<a href="https://www.facebook.com/sharer/sharer.php?u=x">share</a>')).toHaveLength(0);
    expect(at('<a href="https://twitter.com/intent/tweet?text=x">tweet</a>')).toHaveLength(0);
  });

  it("rejects the booking software's account, not the shop's", () => {
    // Real miss from the first crawl: @thecutapp came back as the handle for
    // Kingdom Barbershop, because every shop site embeds a Book Now widget and
    // the widget links its own vendor. Booksy was caught by the cross-row rule
    // only because it appeared on three sites; a smaller vendor would not be.
    expect(at('<a href="https://instagram.com/thecutapp">Book</a>')).toHaveLength(0);
    expect(at('<a href="https://instagram.com/booksy">Book</a>')).toHaveLength(0);
    expect(at('<a href="https://instagram.com/styleseat">Book</a>')).toHaveLength(0);
  });

  it("does not reject a shop whose name merely contains a vendor word", () => {
    // "squarecutsbarber" is a shop; "square" is a vendor. Anchored, not partial.
    expect(at('<a href="https://instagram.com/squarecutsbarber">us</a>')).toHaveLength(1);
  });

  it("rejects a numeric facebook page id scraped from a share URL", () => {
    expect(isPlausibleHandle("facebook", "1234567890")).toBe(false);
  });

  it("rejects an instagram handle longer than instagram allows", () => {
    expect(isPlausibleHandle("instagram", "a".repeat(31))).toBe(false);
    expect(isPlausibleHandle("instagram", "a".repeat(30))).toBe(true);
  });
});

describe("normalising", () => {
  it("strips @, trailing slash, query and case", () => {
    expect(normaliseHandle("@FadesByLuis/")).toBe("fadesbyluis");
    expect(normaliseHandle("TheShop?hl=en")).toBe("theshop");
  });
});

describe("the agency in the footer", () => {
  const row = (entityId: string, handle: string) => ({ entityId, handle, platform: "instagram" });

  it("rejects a handle credited on three unrelated businesses", () => {
    // "Site by @studio" in the footer of every site one designer built.
    const { kept, rejected } = rejectSharedHandles([
      row("a", "webdesignstudio"), row("b", "webdesignstudio"), row("c", "webdesignstudio"),
      row("d", "realshop"),
    ]);
    expect(kept.map((r) => r.handle)).toEqual(["realshop"]);
    expect(rejected).toHaveLength(3);
  });

  it("keeps a handle shared by only two — two campuses legitimately share one", () => {
    const { kept, rejected } = rejectSharedHandles([row("a", "twolocations"), row("b", "twolocations")]);
    expect(kept).toHaveLength(2);
    expect(rejected).toHaveLength(0);
  });

  it("counts distinct businesses, not rows — one site linking twice is not sharing", () => {
    const { kept } = rejectSharedHandles([row("a", "shop"), row("a", "shop"), row("a", "shop")]);
    expect(kept).toHaveLength(3);
  });
});
