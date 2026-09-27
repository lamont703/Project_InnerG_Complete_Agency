import { describe, it, expect } from "vitest";
import { TOOL_REGISTRY, resolveToolAccess, mcpAllowed, type ToolAccessRow } from "./tool-access";

const row = (tool_id: string, mcp_enabled: boolean, chat_enabled = true): ToolAccessRow => ({
  tool_id, mcp_enabled, chat_enabled, updated_at: null, updated_by: null,
});

describe("tool access", () => {
  /**
   * THE ONE THAT MATTERS. Everything else here is bookkeeping; this is the
   * rule that stops a row in a table publishing named individuals — students,
   * their exam scores, a person's address — to a connector any assistant can
   * add. It is asserted against the real registry rather than a fixture, so
   * adding a sensitive tool cannot pass without passing this.
   */
  it("never opens a sensitive tool on the connector, whatever the row says", () => {
    const sensitive = TOOL_REGISTRY.filter((t) => t.sensitive);
    expect(sensitive.length).toBeGreaterThan(0);
    const state = resolveToolAccess(sensitive.map((t) => row(t.id, true)));
    for (const t of sensitive) {
      expect(state.mcp.has(t.id), `${t.id} must stay closed on MCP`).toBe(false);
      expect(mcpAllowed(t)).toBe(false);
    }
  });

  it("every tool returning personal data says what it returns", () => {
    for (const t of TOOL_REGISTRY.filter((x) => x.sensitive)) {
      expect(t.personal, `${t.id} needs a 'personal' line`).toBeTruthy();
    }
  });

  it("falls back to registry defaults when there are no rows", () => {
    const state = resolveToolAccess([]);
    for (const t of TOOL_REGISTRY) {
      expect(state.mcp.has(t.id)).toBe(t.defaultMcp && !t.sensitive);
      expect(state.chat.has(t.id)).toBe(t.defaultChat);
    }
  });

  it("a row overrides the default on both doors", () => {
    const open = TOOL_REGISTRY.find((t) => !t.sensitive && t.defaultMcp)!;
    const off = resolveToolAccess([row(open.id, false, false)]);
    expect(off.mcp.has(open.id)).toBe(false);
    expect(off.chat.has(open.id)).toBe(false);
  });

  it("ignores rows for tools the registry does not know", () => {
    const state = resolveToolAccess([row("some_tool_nobody_registered", true)]);
    expect(state.mcp.has("some_tool_nobody_registered")).toBe(false);
  });
});
