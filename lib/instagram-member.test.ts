import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

let canConnectInstagram: (email?: string | null) => boolean;
let MEMBER_IG_SCOPES: string[];

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  const mod = await import("./instagram-member");
  canConnectInstagram = mod.canConnectInstagram;
  MEMBER_IG_SCOPES = mod.MEMBER_IG_SCOPES;
});

afterEach(() => vi.unstubAllEnvs());

/**
 * Private testing until Meta grants Advanced Access: only the allowlist may
 * connect. The gate is checked when connecting, again in the callback, and in
 * every Instagram MCP tool — this is the function all three call.
 */
describe("Instagram connect allowlist", () => {
  it("lets the allowlisted admin in, case- and space-insensitively", () => {
    expect(canConnectInstagram("lamont703@gmail.com")).toBe(true);
    expect(canConnectInstagram("  Lamont703@Gmail.com ")).toBe(true);
  });

  it("keeps everyone else out, including no email at all", () => {
    expect(canConnectInstagram("someone@example.com")).toBe(false);
    expect(canConnectInstagram(null)).toBe(false);
    expect(canConnectInstagram("")).toBe(false);
  });

  it("opens only when the switch is set to exactly true", () => {
    vi.stubEnv("INSTAGRAM_MEMBER_CONNECT_OPEN", "yes");
    expect(canConnectInstagram("someone@example.com")).toBe(false);
    vi.stubEnv("INSTAGRAM_MEMBER_CONNECT_OPEN", "true");
    expect(canConnectInstagram("someone@example.com")).toBe(true);
  });

  it("asks members for read access only — nothing that posts, comments or messages", () => {
    expect(MEMBER_IG_SCOPES).toEqual(["instagram_business_basic", "instagram_business_manage_insights"]);
  });
});
