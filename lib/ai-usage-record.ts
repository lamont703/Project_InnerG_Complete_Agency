/**
 * Writing an AI call to the usage ledger, and reading it back for the dashboard.
 *
 * The recorder's one hard rule: IT MUST NEVER BREAK THE THING IT MEASURES. An
 * instrument that can take down the feature is worse than no instrument, so
 * every failure here is swallowed and logged. A missing usage row costs a line
 * on a dashboard; a thrown error costs someone their answer.
 */
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { costUsd, type TokenUsage } from "@/lib/ai-usage";

export interface UsageEventInput {
  route: string;
  model: string;
  usage: TokenUsage;
  contextChars?: number | null;
  generations?: number;
  toolCalls?: number;
  latencyMs?: number | null;
  status: "ok" | "error";
  errorKind?: string | null;
  communityMemberId?: string | null;
}

export async function recordAiUsage(input: UsageEventInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await (admin as any).from("ai_usage_events").insert({
      route: input.route,
      model: input.model,
      input_tokens: input.usage.inputTokens,
      output_tokens: input.usage.outputTokens,
      thinking_tokens: input.usage.thinkingTokens,
      // Priced now, at today's published rate, and stored — so a later price
      // change never silently rewrites what past calls cost.
      cost_usd: costUsd(input.model, input.usage),
      context_chars: input.contextChars ?? null,
      generations: input.generations ?? 1,
      tool_calls: input.toolCalls ?? 0,
      latency_ms: input.latencyMs ?? null,
      status: input.status,
      error_kind: input.errorKind ?? null,
      community_member_id: input.communityMemberId ?? null,
    });
  } catch (err: any) {
    console.error("[ai-usage] could not record usage (call itself was unaffected):", err?.message || err);
  }
}

export interface UsageEvent {
  id: string;
  createdAt: string;
  route: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  costUsd: number | null;
  contextChars: number | null;
  generations: number;
  toolCalls: number;
  latencyMs: number | null;
  status: string;
  errorKind: string | null;
  isMember: boolean;
}

export interface UsageSummary {
  events: UsageEvent[];
  totalCost: number;
  totalCalls: number;
  errorCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalThinkingTokens: number;
  avgContextChars: number | null;
  /** Oldest event in the window — how much history the projection rests on. */
  firstSeen: string | null;
}

/**
 * Recent usage, newest first.
 *
 * Deliberately returns raw events alongside the totals rather than only
 * aggregates: the per-call view is what makes an unexpected bill explicable,
 * and one 40k-token outlier is invisible in an average.
 */
export async function getRecentUsage(limit = 100, sinceHours = 24 * 30): Promise<UsageSummary> {
  const empty: UsageSummary = {
    events: [],
    totalCost: 0,
    totalCalls: 0,
    errorCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalThinkingTokens: 0,
    avgContextChars: null,
    firstSeen: null,
  };

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - sinceHours * 3600_000).toISOString();

    // Two queries rather than one: the table returns at most `limit` rows for
    // the list, but the totals must cover the whole window or the dashboard
    // would report "today's spend" as "spend across the last 100 calls" —
    // which is the same number only until it isn't.
    const [listRes, allRes] = await Promise.all([
      (admin as any)
        .from("ai_usage_events")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit),
      (admin as any)
        .from("ai_usage_events")
        .select("cost_usd, input_tokens, output_tokens, thinking_tokens, context_chars, status, created_at")
        .gte("created_at", since),
    ]);

    if (listRes.error || allRes.error) {
      console.error("[ai-usage] read failed:", listRes.error?.message || allRes.error?.message);
      return empty;
    }

    const all = allRes.data || [];
    const contexts = all.map((r: any) => r.context_chars).filter((n: any) => typeof n === "number");

    return {
      events: (listRes.data || []).map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        route: r.route,
        model: r.model,
        inputTokens: r.input_tokens ?? 0,
        outputTokens: r.output_tokens ?? 0,
        thinkingTokens: r.thinking_tokens ?? 0,
        costUsd: r.cost_usd === null ? null : Number(r.cost_usd),
        contextChars: r.context_chars ?? null,
        generations: r.generations ?? 1,
        toolCalls: r.tool_calls ?? 0,
        latencyMs: r.latency_ms ?? null,
        status: r.status,
        errorKind: r.error_kind ?? null,
        isMember: Boolean(r.community_member_id),
      })),
      totalCost: all.reduce((s: number, r: any) => s + Number(r.cost_usd || 0), 0),
      totalCalls: all.length,
      errorCalls: all.filter((r: any) => r.status === "error").length,
      totalInputTokens: all.reduce((s: number, r: any) => s + (r.input_tokens || 0), 0),
      totalOutputTokens: all.reduce((s: number, r: any) => s + (r.output_tokens || 0), 0),
      totalThinkingTokens: all.reduce((s: number, r: any) => s + (r.thinking_tokens || 0), 0),
      avgContextChars: contexts.length
        ? Math.round(contexts.reduce((s: number, n: number) => s + n, 0) / contexts.length)
        : null,
      firstSeen: all.length
        ? all.reduce((min: string, r: any) => (r.created_at < min ? r.created_at : min), all[0].created_at)
        : null,
    };
  } catch (err: any) {
    console.error("[ai-usage] read threw:", err?.message || err);
    return empty;
  }
}
