/**
 * Writing a machine request to the access ledger, and reading it back.
 *
 * THE RECORDER MUST NEVER BREAK THE THING IT MEASURES. Same rule as
 * lib/ai-usage-record.ts, and it matters more here: this sits in the path of
 * the MCP endpoint and the .md layer, which exist precisely to be consumed by
 * clients that will not retry and will not tell us they failed. A dropped log
 * row costs a line on a dashboard. A thrown error costs a crawler its answer
 * and possibly its opinion of whether this site is worth fetching.
 *
 * Hence: every write is fire-and-forget, every failure is swallowed with a
 * console warning, and nothing here is awaited by a request handler.
 */
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { classifyAgent, type AgentKind } from "@/lib/agent-classify";

export type AgentSurface = "mcp" | "md_entity" | "md_page";

export interface AgentRequestInput {
  surface: AgentSurface;
  path: string;
  userAgent?: string | null;
  clientIp?: string | null;
  mcpMethod?: string | null;
  toolName?: string | null;
  toolArguments?: unknown;
  entityType?: string | null;
  slug?: string | null;
  statusCode?: number | null;
  isError?: boolean;
  durationMs?: number | null;
}

/**
 * Arguments are the most useful column in the table and the only one that can
 * carry something a caller chose to send us, so it is capped rather than
 * trusted. The MCP route already refuses bodies over 32KB, but that limit is
 * about protecting the function; this one is about not letting a single row
 * dominate the table.
 */
const MAX_ARGUMENTS_CHARS = 4_000;
const MAX_USER_AGENT_CHARS = 512;

function safeArguments(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  try {
    const json = JSON.stringify(value);
    if (json.length <= MAX_ARGUMENTS_CHARS) return value;
    return { _truncated: true, _chars: json.length, _head: json.slice(0, MAX_ARGUMENTS_CHARS) };
  } catch {
    return { _unserialisable: true };
  }
}

/**
 * Fire-and-forget by design — callers do NOT await this.
 *
 * On serverless there is a real chance a response returns before the insert
 * settles and the instance is frozen mid-write, losing the row. That trade is
 * accepted deliberately: making it reliable means holding the response open on
 * a database round trip, which taxes every crawler fetch to protect a metric.
 * A floor that costs nothing beats an exact count that costs latency.
 */
export function recordAgentRequest(input: AgentRequestInput): void {
  try {
    const ua = input.userAgent?.slice(0, MAX_USER_AGENT_CHARS) ?? null;
    const { name, kind } = classifyAgent(ua);

    const admin = createAdminClient();
    void (admin as any)
      .from("agent_requests")
      .insert({
        surface: input.surface,
        path: input.path,
        mcp_method: input.mcpMethod ?? null,
        tool_name: input.toolName ?? null,
        tool_arguments: safeArguments(input.toolArguments),
        entity_type: input.entityType ?? null,
        slug: input.slug ?? null,
        user_agent: ua,
        agent_name: name,
        agent_kind: kind,
        client_ip: input.clientIp ?? null,
        status_code: input.statusCode ?? null,
        is_error: input.isError ?? false,
        duration_ms: input.durationMs ?? null,
      })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.warn("[agent-requests] insert failed:", error.message);
      });
  } catch (err: any) {
    console.warn("[agent-requests] could not record (request itself unaffected):", err?.message || err);
  }
}

/** Best-effort caller IP, same header order the MCP rate limiter already uses. */
export function clientIpFrom(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null
  );
}

/* ------------------------------------------------------------------ reading */

export interface AgentRequestRow {
  id: string;
  requestedAt: string;
  surface: AgentSurface;
  path: string;
  mcpMethod: string | null;
  toolName: string | null;
  toolArguments: unknown;
  agentName: string | null;
  agentKind: AgentKind;
  userAgent: string | null;
  isError: boolean;
}

export interface AgentTrafficSummary {
  windowHours: number;
  total: number;
  /** ai + search only — the number that answers "is there outside machine demand". */
  externalTotal: number;
  byKind: { kind: AgentKind; count: number }[];
  bySurface: { surface: AgentSurface; count: number }[];
  byAgent: { name: string; kind: AgentKind; count: number }[];
  byTool: { tool: string; count: number }[];
  byPath: { path: string; count: number }[];
  recent: AgentRequestRow[];
}

const EMPTY: Omit<AgentTrafficSummary, "windowHours"> = {
  total: 0,
  externalTotal: 0,
  byKind: [],
  bySurface: [],
  byAgent: [],
  byTool: [],
  byPath: [],
  recent: [],
};

function tally<T extends string>(values: (T | null)[]): { key: T; count: number }[] {
  const counts = new Map<T, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
}

/**
 * The whole dashboard in one query.
 *
 * Pulled as rows and aggregated in JS rather than in SQL because the volume
 * this measures is, at the time of writing, two external requests in five
 * weeks — an RPC would be ceremony around a table that fits in memory many
 * times over. `cap` exists so that stops being true safely: if this ever
 * returns a full page, the counts are understated and the dashboard says so
 * rather than quietly reporting a truncated total as fact.
 */
export async function getAgentTraffic(windowHours = 24 * 30, cap = 5_000): Promise<AgentTrafficSummary> {
  try {
    const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();
    const admin = createAdminClient();
    const { data, error } = await (admin as any)
      .from("agent_requests")
      .select("id,requested_at,surface,path,mcp_method,tool_name,tool_arguments,agent_name,agent_kind,user_agent,is_error")
      .gte("requested_at", since)
      .order("requested_at", { ascending: false })
      .limit(cap);

    if (error) {
      console.warn("[agent-requests] read failed:", error.message);
      return { windowHours, ...EMPTY };
    }

    const rows: any[] = data ?? [];
    const externalTotal = rows.filter((r) => r.agent_kind === "ai" || r.agent_kind === "search").length;

    return {
      windowHours,
      total: rows.length,
      externalTotal,
      byKind: tally<AgentKind>(rows.map((r) => r.agent_kind)).map(({ key, count }) => ({ kind: key, count })),
      bySurface: tally<AgentSurface>(rows.map((r) => r.surface)).map(({ key, count }) => ({ surface: key, count })),
      byAgent: tally<string>(rows.map((r) => r.agent_name)).map(({ key, count }) => ({
        name: key,
        kind: (rows.find((r) => r.agent_name === key)?.agent_kind ?? "unknown") as AgentKind,
        count,
      })),
      byTool: tally<string>(rows.map((r) => r.tool_name)).map(({ key, count }) => ({ tool: key, count })),
      byPath: tally<string>(rows.map((r) => r.path)).slice(0, 20).map(({ key, count }) => ({ path: key, count })),
      recent: rows.slice(0, 100).map((r) => ({
        id: r.id,
        requestedAt: r.requested_at,
        surface: r.surface,
        path: r.path,
        mcpMethod: r.mcp_method,
        toolName: r.tool_name,
        toolArguments: r.tool_arguments,
        agentName: r.agent_name,
        agentKind: r.agent_kind,
        userAgent: r.user_agent,
        isError: r.is_error,
      })),
    };
  } catch (err: any) {
    console.warn("[agent-requests] read threw:", err?.message || err);
    return { windowHours, ...EMPTY };
  }
}
