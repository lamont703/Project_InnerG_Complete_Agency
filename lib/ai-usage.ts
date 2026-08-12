/**
 * WHAT EACH AI CALL COST, AND WHY WE COUNT IT OURSELVES.
 *
 * The chat feature ran for months with no idea what it spent per message. When
 * the free tier's quota finally blocked it, the response body said "Failed to
 * process AI request" and three separate theories were argued before anyone
 * saw the real error. Cost and usage were equally invisible: the only signal
 * that anything was being consumed was the moment it stopped working.
 *
 * TOKENS COME FROM THE API, NOT FROM AN ESTIMATE. Character-count heuristics
 * are fine for a size gauge and useless for money — they ignore the tokenizer,
 * they ignore the tool-call round trip, and for a thinking model they miss an
 * entire billed category. So every figure here is read from the response's
 * usageMetadata, and the character-based approximation in chat-context-slim.ts
 * is kept strictly for "how big is this payload".
 *
 * THINKING TOKENS ARE BILLED AS OUTPUT. gemini-2.5-flash reasons before it
 * answers, and those tokens are charged at the output rate while appearing in
 * none of the text you get back. A 100-word answer can carry several times
 * that in thinking. Counting only the visible answer would under-report the
 * bill, so thoughtsTokenCount is captured separately and added to output.
 *
 * Pure — no network. The recorder lives in lib/ai-usage-record.ts.
 */

export interface ModelPricing {
  /** USD per million input tokens. */
  inputPerMillion: number;
  /** USD per million output tokens, thinking included. */
  outputPerMillion: number;
  /** When these rates were last read from the provider. */
  verifiedOn: string;
  source: string;
}

/**
 * Rates, per model.
 *
 * RE-CHECK BEFORE TRUSTING A COST FIGURE. Provider pricing changes and a stale
 * rate produces a confident, wrong number — the same failure this file exists
 * to prevent, one level up. Every entry carries the date it was read and where
 * from, so a figure on the dashboard can always be traced to a source.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gemini-2.5-flash": {
    inputPerMillion: 0.3,
    outputPerMillion: 2.5,
    verifiedOn: "2026-08-12",
    source: "https://ai.google.dev/gemini-api/docs/pricing",
  },
  // Embeddings are billed separately and far more cheaply than generation.
  // Listed at zero rather than omitted: the free tier does not charge for
  // them at all, and inventing a rate would put a fabricated number on a
  // dashboard whose whole purpose is to be trusted. Set a real rate here if
  // and when the account moves to paid embeddings.
  "gemini-embedding-2": {
    inputPerMillion: 0,
    outputPerMillion: 0,
    verifiedOn: "2026-08-12",
    source: "free tier — no charge recorded",
  },
};

export interface TokenUsage {
  inputTokens: number;
  /** Visible answer tokens only. */
  outputTokens: number;
  /** Reasoning tokens — billed at the output rate, absent from the answer. */
  thinkingTokens: number;
  /** What the provider itself reported as the total, when it did. */
  reportedTotal: number | null;
}

export const EMPTY_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  thinkingTokens: 0,
  reportedTotal: null,
};

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

/**
 * Pull usage out of a Gemini response.
 *
 * Defensive on purpose: this reads a provider's response shape, which changes
 * without warning, and a missing field must degrade to zero rather than throw.
 * A chat answer must never fail because accounting could not be recorded — the
 * whole point is to observe the feature, not to add a way for it to break.
 */
export function extractUsage(response: any): TokenUsage {
  const m = response?.usageMetadata ?? response?.usage_metadata;
  if (!m) return { ...EMPTY_USAGE };
  return {
    inputTokens: num(m.promptTokenCount ?? m.prompt_token_count),
    outputTokens: num(m.candidatesTokenCount ?? m.candidates_token_count),
    thinkingTokens: num(m.thoughtsTokenCount ?? m.thoughts_token_count),
    reportedTotal: num(m.totalTokenCount ?? m.total_token_count) || null,
  };
}

/** Add up usage across the turns of one request (a tool call means two). */
export function sumUsage(parts: TokenUsage[]): TokenUsage {
  return parts.reduce<TokenUsage>(
    (acc, p) => ({
      inputTokens: acc.inputTokens + p.inputTokens,
      outputTokens: acc.outputTokens + p.outputTokens,
      thinkingTokens: acc.thinkingTokens + p.thinkingTokens,
      reportedTotal: (acc.reportedTotal ?? 0) + (p.reportedTotal ?? 0) || null,
    }),
    { ...EMPTY_USAGE }
  );
}

/**
 * What that usage cost, in USD.
 *
 * Returns null for a model with no published rate rather than 0. Zero would
 * render as "free" on the dashboard, which is a claim; null renders as
 * "unknown", which is the truth.
 */
export function costUsd(model: string, usage: TokenUsage): number | null {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return null;
  const billedOutput = usage.outputTokens + usage.thinkingTokens;
  return (
    (usage.inputTokens / 1_000_000) * pricing.inputPerMillion +
    (billedOutput / 1_000_000) * pricing.outputPerMillion
  );
}

/** Money, at a precision that doesn't round a real cost away to "$0.00". */
export function formatUsd(value: number | null): string {
  if (value === null) return "—";
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(5)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

/**
 * What this rate of spending comes to over a month.
 *
 * The single most useful number on the dashboard, because a per-message cost
 * of $0.004 is impossible to reason about and "$12 a month at current volume"
 * is a decision.
 */
export function projectMonthlyUsd(totalUsd: number, daysObserved: number): number | null {
  if (daysObserved <= 0) return null;
  return (totalUsd / daysObserved) * 30;
}
