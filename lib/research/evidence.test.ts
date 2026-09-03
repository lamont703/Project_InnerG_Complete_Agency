// @vitest-environment node
import { describe, it, expect } from "vitest";
import { __REDIRECTED_PATHS_FOR_TEST as MAP } from "./evidence";

/**
 * The map in evidence.ts is a deliberate small copy of redirects that really
 * live in next.config.mjs. Tests run in Node with no bundler, so here we CAN
 * import the real config — which is what makes the copy safe. If a redirect's
 * destination changes and the copy is not updated, this fails instead of the
 * research agent quietly recommending a dead URL again.
 */
describe("redirected paths stay in step with next.config.mjs", () => {
  it("matches the real redirect table", async () => {
    const cfg: any = await import("../../next.config.mjs");
    const list: { source: string; destination: string }[] = await cfg.default.redirects();
    const real = new Map(list.map((r) => [r.source, r.destination]));

    for (const [source, destination] of Object.entries(MAP)) {
      expect(real.has(source), `${source} is no longer redirected in next.config.mjs`).toBe(true);
      expect(real.get(source), `${source} now points somewhere else`).toBe(destination);
    }
  });

  it("covers the renamed search route, which is the one that caused this", async () => {
    expect(MAP["/tools/barbershop-search"]).toBe("/search");
  });
});
