import { describe, it, expect } from "vitest"
import { isExcludedFromSitemap, isMarkdownEligible } from "./public-routes"

/**
 * The AR feature adds two routes whose names differ by four characters and
 * whose sitemap answers are opposites. `/ar-fade-trainer` is a public page;
 * `/ar-lab` 404s in production and must never be advertised.
 *
 * The exclusion check is a prefix match, so the risk is one swallowing the
 * other — silently, in the direction that matters most: a broadened `/ar`
 * prefix would drop the public page from the sitemap and from the .md layer at
 * once, and nothing would fail except the traffic.
 */
describe("AR routes", () => {
  it("keeps the trainer public on both surfaces", () => {
    expect(isExcludedFromSitemap("/ar-fade-trainer")).toBe(false)
    expect(isMarkdownEligible("/ar-fade-trainer")).toBe(true)
  })

  it("keeps the dev-only lab off both surfaces", () => {
    // Its layout calls notFound() in production, so a sitemap entry would be a
    // guaranteed 404 and the .md twin would render nothing.
    expect(isExcludedFromSitemap("/ar-lab")).toBe(true)
    expect(isMarkdownEligible("/ar-lab")).toBe(false)
  })

  it("does not let either prefix swallow the other", () => {
    expect(isExcludedFromSitemap("/ar-lab-notes")).toBe(false)
    expect(isExcludedFromSitemap("/ar")).toBe(false)
    expect(isExcludedFromSitemap("/ar-lab/tiles")).toBe(true)
  })
})
