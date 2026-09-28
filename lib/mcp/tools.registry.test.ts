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
let toolDescriptors: (ctx?: any, enabled?: any, opts?: any) => any[];
let capabilityLines: (scopes: string[]) => string[];

beforeAll(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  const mod = await import("./tools");
  MCP_TOOLS = mod.MCP_TOOLS as any[];
  toolDescriptors = mod.toolDescriptors as any;
  capabilityLines = mod.capabilityLines as any;
});

const OWNER_TOOLS = [
  "my_shearquery_account", "my_google_profile_audit", "my_photo_coverage",
  "my_google_profile", "my_reviews", "my_posts", "my_photos", "my_changes",
];

const owner = (scopes: string[]) => ({ identity: { memberId: "m", keyId: "k", scopes, keyPrefix: "sq_x" } });

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

    const listed = toolDescriptors(owner(["read"])).map((t: any) => t.name);
    for (const n of OWNER_TOOLS) expect(listed).toContain(n);
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

  /**
   * THIS REPLACED "every tool is read-only". Writing arrived on purpose on
   * 2026-09-27 — drafts, then publishing approved inside Claude — so the rule
   * became: anything that is not read-only must be behind an identity AND a
   * scope, and the only tools that may touch the live profile are the two that
   * say so. A new writing tool fails here until it declares which it is.
   */
  it("puts every tool that writes behind an identity and a scope", () => {
    for (const t of MCP_TOOLS.filter((x) => !x.annotations.readOnlyHint)) {
      expect(t.requiresIdentity, `${t.name} writes but does not require identity`).toBe(true);
      expect(t.requiresScope, `${t.name} writes but declares no scope`).toBeTruthy();
    }
  });

  /**
   * Destructive tools are named one by one, so a new one fails here until it
   * is added on purpose. Two change the live Google profile and need
   * "publish"; cancelling an appointment frees a client's booking on the
   * owner's own ShearQuery calendar and is marked destructive so Claude always
   * asks — it needs only "propose" (lib/mcp/calendar-tools.ts). A client
   * cancelling their own booking is the same kind of change from the other
   * side (lib/mcp/client-booking-tools.ts).
   */
  it("names every destructive tool, and only Google changes need publish", () => {
    const destructive = MCP_TOOLS.filter((t) => t.annotations.readOnlyHint === false && t.annotations.destructiveHint !== false);
    expect(destructive.map((t) => t.name).sort()).toEqual(["cancel_appointment", "cancel_my_booking", "publish_change", "undo_change"]);
    for (const t of destructive) expect(t.requiresScope).toBe(t.name.startsWith("cancel_") ? "propose" : "publish");
  });

  it("marks every propose_ tool as a non-destructive draft behind the propose scope", () => {
    const propose = MCP_TOOLS.filter((t) => t.name.startsWith("propose_"));
    expect(propose.length).toBeGreaterThan(8);
    for (const t of propose) {
      expect(t.requiresScope, t.name).toBe("propose");
      expect(t.annotations.readOnlyHint, t.name).toBe(false);
      expect(t.annotations.destructiveHint, t.name).toBe(false);
    }
  });

  /**
   * Lazy authentication: on the sign-in endpoint Claude must SEE owner tools
   * before sign-in, because calling one is what triggers the 401 and the
   * Connect card. Hidden tools would mean sign-in never starts.
   */
  it("advertises every tool before sign-in on the OAuth endpoint", () => {
    const names = toolDescriptors(undefined, undefined, { advertiseAll: true }).map((t: any) => t.name);
    expect(names).toContain("my_google_profile");
    expect(names).toContain("publish_change");
    expect(names.length).toBe(MCP_TOOLS.length);
  });

  it("hides publishing from a key without the publish scope", () => {
    const draftOnly = toolDescriptors(owner(["read", "propose"])).map((t: any) => t.name);
    expect(draftOnly).toContain("propose_description");
    expect(draftOnly).not.toContain("publish_change");
    expect(draftOnly).not.toContain("undo_change");

    const readOnly = toolDescriptors(owner(["read"])).map((t: any) => t.name);
    expect(readOnly.some((n: string) => n.startsWith("propose_"))).toBe(false);

    const full = toolDescriptors(owner(["read", "propose", "publish"])).map((t: any) => t.name);
    expect(full).toContain("publish_change");
  });

  /**
   * Found while adding these tools: lib/tool-access.ts turns a tool off on the
   * connector unless it has a registry row, and my_photo_coverage had none — so
   * it was defined, listed in MCP_TOOLS, and invisible to every client.
   */
  it("gives every MCP tool a tool-access row, or the connector silently hides it", async () => {
    const { TOOL_REGISTRY } = await import("@/lib/tool-access");
    const registered = new Set(TOOL_REGISTRY.filter((t) => t.implemented.includes("mcp")).map((t) => t.id));
    const missing = MCP_TOOLS.map((t) => t.name).filter((n) => !registered.has(n));
    expect(missing, `no tool-access row: ${missing.join(", ")}`).toEqual([]);
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

/**
 * THE CLAIMS HAVE TO MATCH THE TOOLS.
 *
 * Reported from a live session: the account tool said "read — yes: this owner's
 * audit, reviews, photos and change history" when no tool returned reviews or
 * change history, so the model offered to show photos it could not fetch. The
 * propose line had failed the same way a day earlier. Both were sentences
 * somebody typed; the fix was to generate them, and this is what keeps them
 * generated.
 */
describe("capabilityLines — no claim without a tool behind it", () => {
  it("names only what registered owner tools actually return", () => {
    const [read] = capabilityLines(["read", "propose"]);
    const provided = MCP_TOOLS.filter((t) => t.requiresIdentity && t.annotations.readOnlyHint).map((t) => t.provides);
    for (const p of provided) expect(read).toContain(p);
  });

  it("gives every owner tool a `provides`, or it cannot be honestly advertised", () => {
    for (const t of MCP_TOOLS.filter((x) => x.requiresIdentity)) {
      expect(t.provides, `${t.name} needs a provides`).toBeTruthy();
      expect((t.provides as string).length).toBeGreaterThan(10);
    }
  });

  it("never claims capabilities we have retired the tools for", () => {
    // The specific words that were wrong. If a tool returning reviews or change
    // history is added later, it brings its own `provides` and this relaxes.
    const [read] = capabilityLines(["read", "propose"]);
    const unbacked = ["reviews", "change history"].filter(
      (word) => read.includes(word) && !MCP_TOOLS.some((t) => (t.provides || "").includes(word))
    );
    expect(unbacked, `claimed without a tool: ${unbacked.join(", ")}`).toEqual([]);
  });

  it("offers drafting only to a key with the propose scope", () => {
    expect(capabilityLines(["read", "propose"])[1]).toContain("propose — yes");
    expect(capabilityLines(["read"])[1]).toContain("propose — no");
  });

  it("says publish NO unless the key carries the publish scope", () => {
    for (const scopes of [["read"], ["read", "propose"], []]) {
      expect(capabilityLines(scopes as string[]).at(-1)).toContain("publish — NO");
    }
    expect(capabilityLines(["read", "propose", "publish"]).at(-1)).toContain("publish — yes");
  });

  it("reports read as no when the key lacks the scope", () => {
    expect(capabilityLines(["propose"])[0]).toContain("read    — no");
  });
});
