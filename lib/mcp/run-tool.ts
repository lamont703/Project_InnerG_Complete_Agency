import "server-only";
import { TOOL_BY_NAME, type McpTool, type McpToolContext } from "@/lib/mcp/tools";
import { isToolEnabled } from "@/lib/tool-access";
import { SITE_URL } from "@/lib/site";
import type { McpIdentity } from "@/lib/mcp/connection";
import { runInDemo, type DemoContext } from "@/lib/demo/core";
import { activeDemo } from "@/lib/demo/session";
import { DEMO_EXEMPT } from "@/lib/mcp/demo-tools";

/**
 * RUN ONE SHEARQUERY TOOL, WITH EVERY GATE — the single path for Claude's
 * connection (lib/mcp/handler.ts) and the site's own chat (app/api/chat).
 *
 * The gates live here, once: the tool exists and is switched on, the caller
 * has the identity and scope it needs, and a member in demo mode has it run as
 * their made-up business inside runInDemo. Two doors with their own copies of
 * these checks is two places to forget one, and forgetting the identity gate
 * is a data leak.
 *
 * What stays in the handler is protocol only: Claude's 401 and 403 challenges,
 * which make Claude show its Connect card, have no meaning in the site chat.
 */

export type ToolRun =
  | { ok: true; text: string; structuredContent?: Record<string, unknown>; tool: McpTool }
  | { ok: false; reason: "unknown"; text: string }
  | { ok: false; reason: "refused" | "failed"; text: string; tool: McpTool };

/** Which door is asking — only changes how a refusal is worded. */
export type ToolDoor = "mcp" | "site";

/** First line of every demo result, so no answer can be read as a real business. */
function demoBanner(demo: DemoContext): string {
  return `[DEMO — a made-up ${demo.businessType.replace("_", " ")}. Nothing here is a real business, and nothing reaches Google, Instagram or any customer. stop_demo leaves.]`;
}

export async function runTool(args: {
  name: unknown;
  input: Record<string, unknown> | undefined;
  identity: McpIdentity | null;
  toolContext: McpToolContext;
  door: ToolDoor;
}): Promise<ToolRun> {
  const { name, identity, toolContext, door } = args;
  const tool = typeof name === "string" ? TOOL_BY_NAME.get(name) : undefined;
  // Switched off on the connector is switched off everywhere: /admin/tool-access
  // governs the tool, whichever door it is called through.
  if (!tool || !(await isToolEnabled(tool.name, "mcp"))) return { ok: false, reason: "unknown", text: `Unknown tool: ${String(name)}` };

  if (tool.requiresIdentity && !identity) {
    return {
      ok: false, reason: "refused", tool,
      text: door === "site"
        ? `"${tool.name}" works on one person's own ShearQuery account, so they need to sign in first: ${SITE_URL}/login.`
        : `"${tool.name}" answers about one specific business, so it needs that owner's own ` +
          `connection. This connection is the public one. The owner can generate their ` +
          `connection URL at ${SITE_URL}/account/claude and add that instead of ${SITE_URL}/mcp.`,
    };
  }

  if (tool.requiresScope && !identity?.scopes.includes(tool.requiresScope)) {
    return {
      ok: false, reason: "refused", tool,
      text: tool.requiresScope === "publish"
        ? `This connection was created without permission to publish, so "${tool.name}" cannot run. ` +
          `The owner can create a connection with publishing turned on at ${SITE_URL}/account/claude.`
        : `This connection does not have the "${tool.requiresScope}" permission that "${tool.name}" needs.`,
    };
  }

  /**
   * DEMO MODE (lib/demo/). A member in a demo gets this tool run as their
   * made-up business: the identity is swapped here, once, and the call runs
   * inside runInDemo, which is what keeps every outbound request and every
   * text or email inside the fence. Only owner-scoped tools are swapped;
   * DEMO_EXEMPT ones always see the real member.
   *
   * If demo mode can't be checked, the call is REFUSED rather than run as the
   * real account: for an admin with a real Google profile, "run it anyway"
   * turns a demo publish into a real one.
   */
  let runContext = toolContext;
  let demo: DemoContext | null = null;
  if (tool.requiresIdentity && identity && !DEMO_EXEMPT.has(tool.name)) {
    try {
      demo = await activeDemo(identity.memberId);
    } catch (err) {
      console.error("[tools] demo check failed:", err);
      return { ok: false, reason: "failed", tool, text: "Couldn't check whether this account is in demo mode, so nothing was run. Try again in a moment." };
    }
    if (demo) runContext = { ...toolContext, identity: { ...identity, memberId: demo.demoMemberId } };
  }

  try {
    const input = args.input ?? {};
    const out = demo ? await runInDemo(demo, () => tool.handler(input, runContext)) : await tool.handler(input, runContext);
    const raw = typeof out === "string" ? out : out.text;
    return {
      ok: true, tool,
      text: demo ? `${demoBanner(demo)}\n\n${raw}` : raw,
      ...(typeof out !== "string" && out.structuredContent ? { structuredContent: out.structuredContent } : {}),
    };
  } catch (err) {
    // Reported as a result the model can read and adapt to, not a crash.
    console.error(`[tools] ${tool.name} failed:`, err);
    return { ok: false, reason: "failed", tool, text: `The "${tool.name}" tool could not complete: ${err instanceof Error ? err.message : "unknown error"}` };
  }
}
