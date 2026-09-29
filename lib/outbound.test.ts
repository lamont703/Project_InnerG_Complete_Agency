import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const { fake } = vi.hoisted(() => ({ fake: vi.fn(async () => new Response("{}", { status: 200 })) }));
vi.mock("@/lib/demo/fake-services", () => ({ fakeServiceResponse: fake }));

import { outboundFetch } from "./outbound";
import { runInDemo, demoToken } from "./demo/core";

const ID = "3f2b8c1e-1111-4222-8333-944455556666";
const ctx = { ownerMemberId: "owner", demoMemberId: ID, demoEmail: "x@demo.shearquery.invalid", businessType: "salon" };

describe("outboundFetch — the one door", () => {
  beforeEach(() => {
    fake.mockClear();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("real")));
  });

  it("sends a demo credential to the fake from ANY caller, demo running or not", async () => {
    await outboundFetch("https://mybusiness.googleapis.com/v4/x", { headers: { Authorization: `Bearer ${demoToken(ID)}` } });
    await outboundFetch(`https://graph.instagram.com/v25.0/me?access_token=${demoToken(ID)}`);
    await outboundFetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ refresh_token: demoToken(ID), grant_type: "refresh_token" }) });
    expect(fake).toHaveBeenCalledTimes(3);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses every other external request during a demo, but allows our database", async () => {
    await runInDemo(ctx, async () => {
      await expect(outboundFetch("https://mybusiness.googleapis.com/v4/x", { headers: { Authorization: "Bearer ya29.real" } })).rejects.toThrow(/Demo mode/);
      await expect(outboundFetch("https://services.leadconnectorhq.com/conversations/messages", { method: "POST" })).rejects.toThrow(/Demo mode/);
      await outboundFetch("https://abc.supabase.co/storage/v1/object/public/x.jpg", { method: "HEAD" });
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("is a plain fetch outside a demo", async () => {
    await outboundFetch("https://mybusiness.googleapis.com/v4/x", { headers: { Authorization: "Bearer ya29.real" } });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fake).not.toHaveBeenCalled();
  });

  it("is the ONLY way our code reaches Google, Instagram or GoHighLevel", () => {
    // A direct fetch to one of these hosts would skip the demo fences.
    const HOSTS = /googleapis\.com|graph\.instagram\.com|leadconnectorhq\.com|GHL_API_BASE|IG_GRAPH|V4_BASE|BIZ_INFO|\bV4\b/;
    // ShearQuery's OWN accounts — its YouTube channel, TikTok posting, brand
    // Google profile, content stats — and the Instagram code exchange at
    // connect time. No member credential, so no demo business, ever reaches
    // these. A new file is not on this list: add it here only with a reason.
    const PLATFORM_ONLY = new Set([
      "content-metrics.ts", "gbp-brand-publish.ts", "instagram-oauth.ts", "youtube-demand.ts",
      "tiktok-ghl-publish.ts", "youtube-comments.ts", "youtube-publish.ts",
    ]);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { if (name !== "node_modules") walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(name) || /\.test\.tsx?$/.test(name) || p.endsWith("outbound.ts") || PLATFORM_ONLY.has(name)) continue;
        const src = readFileSync(p, "utf8");
        for (const line of src.split("\n")) {
          if (/(?<![\w.])fetch\(/.test(line) && HOSTS.test(line)) offenders.push(`${p}: ${line.trim().slice(0, 100)}`);
        }
      }
    };
    walk(join(process.cwd(), "lib"));
    expect(offenders).toEqual([]);
  });
});
