import { describe, it, expect, beforeAll, vi } from "vitest";

/**
 * The registry, not the handlers.
 *
 * Every owner-scoped tool has to be three things at once: defined, listed in
 * MCP_TOOLS, and flagged requiresIdentity. Miss the second and the tool exists
 * in the file but answers "Unknown tool" — which is exactly what happened when
 * my_photo_coverage was written and the array was not updated, and the only
 * symptom was a model politely telling an owner the feature was unavailable.
 *
 * Miss the third and it leaks: an owner-scoped tool without requiresIdentity is
 * served to the anonymous endpoint, where identity is null and the handler
 * reads whatever a null member id matches.
 *
 * tools.ts builds a Supabase client at module scope, so the env has to exist
 * before the import — hence the dynamic import below rather than a static one.
 */

let MCP_TOOLS: any[];
let toolDescriptors: (ctx?: any) => any[];

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  const mod = await import("./tools");
  MCP_TOOLS = mod.MCP_TOOLS as any[];
  toolDescriptors = mod.toolDescriptors as any;
});

const OWNER_TOOLS = ["my_shearquery_account", "my_google_profile_audit", "my_photo_coverage"];

describe("the MCP tool registry", () => {
  it("registers every owner tool, so none can be defined but unreachable", () => {
    const names = MCP_TOOLS.map((t) => t.name);
    for (const n of OWNER_TOOLS) expect(names).toContain(n);
  });

  it("flags every my_* tool as requiresIdentity", () => {
    // The naming convention IS the contract: my_ means "about one owner".
    for (const t of MCP_TOOLS.filter((x) => x.name.startsWith("my_"))) {
      expect(t.requiresIdentity, `${t.name} must require identity`).toBe(true);
    }
  });

  it("hides owner tools from an anonymous listing and shows them to an owner", () => {
    const anon = toolDescriptors().map((t: any) => t.name);
    for (const n of OWNER_TOOLS) expect(anon).not.toContain(n);

    const owner = toolDescriptors({ identity: { memberId: "m", keyId: "k", scopes: ["read"], keyPrefix: "sq_x" } })
      .map((t: any) => t.name);
    for (const n of OWNER_TOOLS) expect(owner).toContain(n);
  });

  it("gives every tool annotations, since the protocol defaults are hostile", () => {
    // readOnlyHint defaults false and destructiveHint defaults true, so a tool
    // that says nothing is advertised as one that may destroy something.
    for (const t of MCP_TOOLS) {
      expect(t.annotations, `${t.name} has no annotations`).toBeTruthy();
      expect(typeof t.annotations.readOnlyHint).toBe("boolean");
      expect(typeof t.annotations.openWorldHint).toBe("boolean");
    }
  });

  it("keeps every tool read-only until a propose_ tool is deliberately added", () => {
    // The day this fails is the day something writes. It should fail loudly and
    // be updated on purpose, not drift.
    for (const t of MCP_TOOLS) {
      expect(t.annotations.readOnlyHint, `${t.name} is not read-only`).toBe(true);
    }
    expect(MCP_TOOLS.filter((t) => t.name.startsWith("propose_"))).toHaveLength(0);
  });

  it("gives each tool a unique name and a non-empty description", () => {
    const names = MCP_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const t of MCP_TOOLS) {
      expect(t.description.length, `${t.name} needs a description`).toBeGreaterThan(40);
      expect(t.inputSchema).toBeTruthy();
    }
  });
});
