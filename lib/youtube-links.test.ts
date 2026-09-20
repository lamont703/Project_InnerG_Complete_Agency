import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
// @ts-expect-error — plain ESM, deliberately untyped so next.config.mjs can read it.
import { YOUTUBE_LINKS, youtubeLinkRedirects, sourceTag } from "./youtube-links.mjs";
import { AUDIENCES } from "./audiences";

const APP = path.join(__dirname, "..", "app");

/**
 * These links are the only thing standing between a published video and a dead
 * end, and every way they break is quiet: a 308 that caches, a slug shadowed by
 * a real page, a destination that 404s, an audience name that drifts from the
 * registry. None of them throws. So they are asserted here instead.
 */
describe("youtube audience links", () => {
  it("redirects TEMPORARILY, which is the entire point of the layer", () => {
    // 308 tells the browser to cache the redirect forever. Ship that and the
    // day the offer changes, everyone who already clicked keeps landing on the
    // old destination out of their own cache — unreachable and unreported.
    for (const r of youtubeLinkRedirects()) {
      expect(r.permanent, `${r.source} must be a 307, never a 308`).toBe(false);
    }
  });

  it("uses audience ids the rest of the app already knows", () => {
    // A link that says "shops" while the app says "owner" is a second
    // vocabulary, and two vocabularies for one thing always drift.
    const known = new Set(Object.keys(AUDIENCES));
    for (const l of YOUTUBE_LINKS) {
      expect(known, `${l.slug} -> unknown audience "${l.audience}"`).toContain(l.audience);
    }
  });

  it("gives each audience its own slug and its own destination", () => {
    const slugs = YOUTUBE_LINKS.map((l: { slug: string }) => l.slug);
    const audiences = YOUTUBE_LINKS.map((l: { audience: string }) => l.audience);
    const dests = YOUTUBE_LINKS.map((l: { destination: string }) => l.destination);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(audiences).size).toBe(audiences.length);
    // Two audiences sharing a destination means they were never two audiences.
    expect(new Set(dests).size).toBe(dests.length);
  });

  it("points at pages that exist", () => {
    // A link in a permanent video to a route that was renamed is the failure
    // this whole indirection exists to make fixable — but it still has to be
    // caught, and a 404 on a redirect target is invisible until someone clicks.
    for (const l of YOUTUBE_LINKS as { slug: string; destination: string }[]) {
      expect(l.destination.startsWith("/"), `${l.slug} must be site-relative`).toBe(true);
      expect(l.destination, `${l.slug} destination carries its own query`).not.toContain("?");
      const dir = path.join(APP, l.destination);
      const exists = ["page.tsx", "page.ts", "page.jsx", "page.js", "route.ts"]
        .some((f) => fs.existsSync(path.join(dir, f)));
      expect(exists, `${l.destination} has no page in app/`).toBe(true);
    }
  });

  it("does not shadow a real route with a slug", () => {
    // /barbers, /schools, /salons and /stores are live directory pages. The
    // /youtube/ prefix is what keeps these links out of that namespace — this
    // fails if anyone ever flattens them.
    for (const r of youtubeLinkRedirects() as { source: string }[]) {
      expect(r.source.startsWith("/youtube/")).toBe(true);
      const bare = r.source.replace("/youtube/", "");
      expect(bare).not.toContain("/");
      // The prefix is doing real work: prove the bare slug would have collided
      // or could later, by asserting we never rely on it being free.
      expect(fs.existsSync(path.join(APP, "youtube", bare))).toBe(false);
    }
  });

  it("stamps a source tag so attribution cannot be left off a description", () => {
    // The pixel never fires on /youtube/<slug> — a 307 serves no HTML, so
    // nothing is recorded there and the destination's query string is the only
    // carrier of where the visit came from. Leaving that to whoever writes the
    // description means the one video that matters is the one it was forgotten
    // on, so the redirect stamps it.
    for (const r of youtubeLinkRedirects() as { source: string; destination: string }[]) {
      const slug = r.source.replace("/youtube/", "");
      const q = new URLSearchParams(r.destination.split("?")[1] || "");
      expect(q.get("src"), `${r.source} must stamp ?src=`).toBe(sourceTag(slug));
    }
  });

  it("leaves room for a per-video tag rather than owning the whole query", () => {
    // Next.js merges the request's query into the destination's, which is what
    // lets a description add ?v=<video id> on top. Verified against the running
    // server: /youtube/barbers?v=X -> ...?v=X&src=youtube-barbers. If the
    // destination ever hardcoded the whole query this would stop being true.
    for (const r of youtubeLinkRedirects() as { destination: string }[]) {
      const q = new URLSearchParams(r.destination.split("?")[1] || "");
      expect([...q.keys()]).toEqual(["src"]);
      expect(q.get("v"), "v= belongs to the description, not the redirect").toBeNull();
    }
  });
});
