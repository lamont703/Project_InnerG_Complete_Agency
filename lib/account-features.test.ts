import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { CLAUDE_FEATURES, featureGuide, typeGuide } from "./account-features";

/**
 * The guide is what agencies repeat to businesses, so it must not name a tool
 * that doesn't exist, call a gated feature available, or promise free forever.
 */

let toolNames: Set<string>;
let registryIds: Set<string>;

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  toolNames = new Set((await import("./mcp/tools")).MCP_TOOLS.map((t: any) => t.name));
  registryIds = new Set((await import("./tool-access")).TOOL_REGISTRY.map((t) => t.id));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

describe("the account feature guide", () => {
  it("backs every Claude feature with tools that exist and are registered", () => {
    for (const f of CLAUDE_FEATURES) {
      for (const t of f.tools) {
        expect(toolNames.has(t), `${f.id} names ${t}, which isn't an MCP tool`).toBe(true);
        expect(registryIds.has(t), `${f.id} names ${t}, which lib/tool-access.ts doesn't list`).toBe(true);
      }
    }
  });

  it("calls the calendar and Instagram 'testing' until their switches open them", () => {
    vi.stubEnv("CALENDAR_OPEN", "");
    vi.stubEnv("INSTAGRAM_MEMBER_CONNECT_OPEN", "");
    const shop = typeGuide("barbershop").claude;
    expect(shop.find((c) => c.title.includes("appointment book"))?.status).toBe("testing");
    expect(shop.find((c) => c.title.includes("Instagram"))?.status).toBe("testing");
    expect(shop.find((c) => c.title.includes("Google Business Profile"))?.status).toBe("live");

    vi.stubEnv("CALENDAR_OPEN", "true");
    expect(typeGuide("barbershop").claude.find((c) => c.title.includes("appointment book"))?.status).toBe("live");
    expect(typeGuide("client").claude.find((c) => c.title.includes("book in Claude"))?.status).toBe("live");
  });

  it("never carries a 'Free, Always' promise", () => {
    for (const g of featureGuide()) expect(g.website.map((w) => w.title)).not.toContain("Free, Always");
  });

  it("covers every type an agency signs up, and not the agency itself", () => {
    const ids = featureGuide().map((g) => g.id);
    expect(ids).toEqual(expect.arrayContaining(["barbershop", "salon", "barber", "cosmetologist", "school", "supply_store"]));
    expect(ids).not.toContain("agency");
    for (const g of featureGuide()) expect(g.claude.length, `${g.id} has no Claude features`).toBeGreaterThan(0);
  });
});
