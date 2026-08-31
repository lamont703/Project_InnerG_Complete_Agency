import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { isExcludedFromSitemap, isMarkdownEligible } from "./public-routes";

/**
 * The invariant this file protects.
 *
 * app/sitemap.ts CRAWLS THE FILESYSTEM, so adding a page.tsx anywhere under
 * app/ publishes that route to Google and to the `.md` crawler layer unless a
 * prefix in public-routes.ts says otherwise. That is a default-open surface:
 * the failure is silent, and it already happened once — the school console and
 * the ungated student kiosk were both advertised in the sitemap for weeks
 * because nobody added the prefix when the pages were built.
 *
 * The test below re-walks the same tree the sitemap builder does and asserts
 * that nothing private is eligible, so the next private surface added under a
 * new prefix fails here instead of in a search index.
 */
function crawl(dir: string, base = ""): string[] {
  let routes: string[] = [];
  if (!fs.existsSync(dir)) return routes;
  for (const file of fs.readdirSync(dir)) {
    if (file === "api" || file.startsWith("_") || file.startsWith(".") || file.startsWith("[")) continue;
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      const next = file.startsWith("(") && file.endsWith(")") ? base : `${base}/${file}`;
      routes = routes.concat(crawl(full, next));
    } else if (file === "page.tsx" || file === "page.js") {
      routes.push(base === "" ? "/" : base);
    }
  }
  return routes;
}

const PRIVATE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/account",
  "/school",
  "/student",
  "/login",
  "/select-portal",
  "/internal-lock",
];

describe("private surfaces stay out of the sitemap and the .md layer", () => {
  const routes = crawl(path.join(process.cwd(), "app"));

  it("finds routes at all — a crawler that returns nothing would pass vacuously", () => {
    expect(routes.length).toBeGreaterThan(50);
  });

  for (const prefix of PRIVATE_PREFIXES) {
    it(`excludes everything under ${prefix}`, () => {
      const under = routes.filter((r) => r === prefix || r.startsWith(`${prefix}/`));
      // Each prefix must actually match something, or the test is asserting
      // nothing and would keep passing after the pages were renamed.
      expect(under.length).toBeGreaterThan(0);
      for (const r of under) {
        expect(isExcludedFromSitemap(r), `${r} is in the sitemap`).toBe(true);
        expect(isMarkdownEligible(r), `${r}.md is servable`).toBe(false);
      }
    });
  }

  it("still lets ordinary public pages through", () => {
    expect(isExcludedFromSitemap("/texas-barber-practical-exam-kit-list")).toBe(false);
    expect(isMarkdownEligible("/texas-barber-practical-exam-kit-list")).toBe(true);
  });

  it("keeps the kiosk out specifically", () => {
    // Named on its own because it is the one that was genuinely dangerous:
    // ungated by design, so a crawler would have reached a working clock-in
    // terminal rather than a login wall.
    expect(isExcludedFromSitemap("/school/clock")).toBe(true);
    expect(isMarkdownEligible("/school/clock")).toBe(false);
  });
});
