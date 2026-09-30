import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { MCP_TOOLS, TOOL_BY_NAME, type McpTool } from "@/lib/mcp/tools";
import { TOOL_REGISTRY } from "@/lib/tool-access";
import { getToolAccess } from "@/lib/tool-access";
import { runTool, type ToolRun } from "@/lib/mcp/run-tool";
import type { McpIdentity } from "@/lib/mcp/connection";
import type { AudienceId } from "@/lib/audiences";

/**
 * THE SITE CHAT GETS THE SAME TOOLS AS CLAUDE.
 *
 * Decided 2026-09-29: the /search chat should work the way ShearQuery works in
 * Claude — look things up, then act on the member's own account — without
 * replacing what the chat already does. So the chat keeps its own lookups and
 * context, and is ALSO handed the connector's tools (lib/mcp/tools.ts), run
 * through the one shared path (lib/mcp/run-tool.ts) with the same identity,
 * scope and demo gates Claude's connection uses.
 *
 * Two things differ from Claude, both on purpose:
 *  1. WHO: the member is whoever is signed in to the website. No sign-in, only
 *     the public tools.
 *  2. APPROVAL: Claude asks the person before a tool that changes something.
 *     Our chat has no such prompt of its own, so a changing tool is never run
 *     by the model: it becomes a Confirm button (a signed, one-time action),
 *     and runs only when the member taps it (app/api/chat/action).
 *
 * Gemini runs it (the product owner kept Gemini for cost). The tools are
 * handed over as plain JSON Schema, so swapping the model later doesn't touch
 * the tools.
 */

const db = () => createAdminClient() as any;

const GROUP = new Map(TOOL_REGISTRY.map((t) => [t.id, t.group]));

/** Always offered: public data and getting started. Client booking is for everyone. */
const PUBLIC_GROUPS = ["Schools & exams", "Shops & rent", "Licensing", "Google Business Profile", "Getting started", "Client: booking"];
const BUSINESS_TYPES: AudienceId[] = ["barber", "cosmetologist", "barbershop", "salon", "supply_store", "school"];

/**
 * Changing tools that run without a Confirm button, because they change
 * nothing anyone would need to approve: a draft is only a draft (publishing
 * it is confirmed), a phone code is what the member just asked for, and a
 * demo is made-up data.
 */
const NO_CONFIRM = new Set(["verify_my_phone", "confirm_my_phone", "start_demo", "stop_demo"]);

export function needsConfirmation(tool: McpTool): boolean {
  if (tool.annotations.readOnlyHint) return false;
  if (NO_CONFIRM.has(tool.name)) return false;
  if (tool.name.startsWith("propose_")) return false;
  return true;
}

/**
 * Which connector tools this person's chat is offered. Fewer is better for a
 * small model: a client isn't shown agency tools, anonymous visitors only the
 * public ones, and nothing with a Claude-only interface (an MCP App view).
 */
export async function siteToolsFor(who: { memberId: string | null; audience: AudienceId | null; isAdmin: boolean }): Promise<McpTool[]> {
  const enabled = (await getToolAccess()).mcp;
  return MCP_TOOLS.filter((t) => {
    if (!enabled.has(t.name) || t.meta) return false;
    if (t.requiresIdentity && !who.memberId) return false;
    if (who.isAdmin) return true;
    const group = GROUP.get(t.name) ?? "";
    if (PUBLIC_GROUPS.some((g) => group.startsWith(g))) return true;
    if (!who.memberId) return false;
    if (group.startsWith("Agency")) return who.audience === "agency";
    if (group.startsWith("Owner")) return who.audience === "agency" || (!!who.audience && BUSINESS_TYPES.includes(who.audience));
    return false;
  });
}

/** Gemini function declarations, from the connector's own JSON Schemas. */
export function geminiDeclarations(tools: McpTool[]) {
  return tools.map((t) => ({
    name: t.name,
    description: `${t.title}. ${t.description}${needsConfirmation(t) ? " (Changes something: the member confirms with a button before it runs.)" : ""}`.slice(0, 1500),
    parametersJsonSchema: t.inputSchema,
  }));
}

/** The website member, as the connector's identity. Their own session is the proof, so every scope applies — and every change is confirmed. */
export function siteIdentity(memberId: string): McpIdentity {
  return { memberId, keyId: "site-chat", scopes: ["read", "propose", "publish"], keyPrefix: "site", via: "key" };
}

export async function runForSite(name: string, input: Record<string, unknown>, memberId: string | null, origin: string): Promise<ToolRun> {
  const identity = memberId ? siteIdentity(memberId) : null;
  return runTool({ name, input, identity, toolContext: { identity, origin }, door: "site" });
}

// ── confirm buttons ─────────────────────────────────────────────────────────

const ACTION_TTL_MS = 30 * 60_000;

function secret(): string {
  const s = process.env.CHAT_ACTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("No secret for chat actions.");
  return createHmac("sha256", s).update("shearquery-chat-actions").digest("hex");
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export interface PendingAction {
  token: string;
  tool: string;
  title: string;
  /** The details the member is approving, in plain words. */
  details: string[];
  destructive: boolean;
}

/** A changing tool call the model asked for, turned into a button only this member can press, once, soon. */
export function pendingAction(memberId: string, tool: McpTool, input: Record<string, unknown>): PendingAction {
  const body = b64(JSON.stringify({ m: memberId, t: tool.name, a: input, e: Date.now() + ACTION_TTL_MS, n: randomBytes(9).toString("base64url") }));
  return {
    token: `${body}.${sign(body)}`,
    tool: tool.name,
    title: tool.title,
    details: describeInput(input),
    destructive: tool.annotations.destructiveHint === true,
  };
}

function describeInput(input: Record<string, unknown>): string[] {
  return Object.entries(input)
    .filter(([, v]) => v !== undefined && v !== null && v !== "" && (typeof v !== "object" || Array.isArray(v)))
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${Array.isArray(v) ? v.join(", ") : String(v)}`.slice(0, 160))
    .slice(0, 8);
}

/**
 * Run a confirmed action. Checks the signature, that it's the same member,
 * that it hasn't expired, and that it hasn't been pressed before — a
 * double-tap on "Book" must not book twice.
 */
export async function confirmAction(token: string, memberId: string, origin: string): Promise<{ ok: true; text: string; title: string } | { ok: false; error: string }> {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return { ok: false, error: "That action isn't valid." };
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, error: "That action isn't valid." };
  let p: { m: string; t: string; a: Record<string, unknown>; e: number; n: string };
  try {
    p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, error: "That action isn't valid." };
  }
  if (p.m !== memberId) return { ok: false, error: "That action belongs to a different account." };
  if (Date.now() > p.e) return { ok: false, error: "That button has expired. Ask again and it'll offer a fresh one." };
  const tool = TOOL_BY_NAME.get(p.t);
  if (!tool) return { ok: false, error: "That action isn't available any more." };

  const { error } = await db().from("chat_confirmed_actions").insert({ nonce: p.n, community_member_id: memberId, tool: p.t });
  if (error) return { ok: false, error: error.code === "23505" ? "That's already been done." : "Couldn't record that action. Try again." };

  const run = await runForSite(p.t, p.a, memberId, origin);
  return run.ok ? { ok: true, text: run.text, title: tool.title } : { ok: false, error: run.text };
}

/** Links in a tool's text answer (booking pages, Stripe payment links), so the chat's link filter lets them through. */
export function linksIn(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s)\]]+/g)].map((m) => m[0].replace(/[.,;]+$/, ""));
}
