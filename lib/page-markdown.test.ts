import { describe, it, expect, vi, afterEach } from "vitest";

// page-markdown.ts imports "server-only", which exists to fail loudly outside a
// server context — including here. Stubbed so the extraction logic can be tested
// directly; nothing in these tests touches a server API.
vi.mock("server-only", () => ({}));

import { renderPageMarkdown } from "./page-markdown";

/**
 * The .md twin is what AI crawlers read, so text that runs together there is a
 * defect even though the rendered page looks fine.
 *
 * The case pinned below shipped live: a headline split with Tailwind's
 * `<span className="block">` produced "Google Business Profile Optimizationfor
 * barbershops" in the twin. A span is inline by default and must stay that way —
 * "Shear<span>Query</span>" is one word — so the separator is keyed off the
 * block class rather than applied to every span.
 */

const page = (body: string) => `<!doctype html><html><head><title>T</title></head><body>${body}</body></html>`;

const stubFetch = (html: string) =>
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    text: async () => html,
    headers: { get: () => "text/html" },
  })));

afterEach(() => vi.unstubAllGlobals());

describe("renderPageMarkdown — block spans", () => {
  it("separates a headline split with a block span", async () => {
    stubFetch(page(`<h1>Google Business Profile Optimization<span class="block text-indigo-600">for barbershops, salons</span></h1>`));
    const out = await renderPageMarkdown("/x", "https://example.com");
    expect(out!.markdown).toContain("Google Business Profile Optimization for barbershops, salons");
    expect(out!.markdown).not.toContain("Optimizationfor");
  });

  it("keeps an ordinary inline span joined, so the brand stays one word", async () => {
    stubFetch(page(`<h1>Shear<span class="text-primary">Query</span></h1>`));
    const out = await renderPageMarkdown("/x", "https://example.com");
    expect(out!.markdown).toContain("ShearQuery");
    expect(out!.markdown).not.toMatch(/Shear\s+Query/);
  });

  it("treats a responsive block variant the same way", async () => {
    stubFetch(page(`<h1>Hair salons<span class="sm:block">hiring in Houston</span></h1>`));
    const out = await renderPageMarkdown("/x", "https://example.com");
    expect(out!.markdown).toContain("Hair salons hiring in Houston");
  });

  it("does not treat inline-block as a line break", async () => {
    stubFetch(page(`<h1>Shear<span class="inline-block">Query</span></h1>`));
    const out = await renderPageMarkdown("/x", "https://example.com");
    expect(out!.markdown).toContain("ShearQuery");
  });

  it("drops an empty span without leaving stray whitespace", async () => {
    stubFetch(page(`<h1>Barbershops<span class="block"></span></h1>`));
    const out = await renderPageMarkdown("/x", "https://example.com");
    expect(out!.markdown).toMatch(/#\s*Barbershops\s*$/m);
  });
});
