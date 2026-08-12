/**
 * WHICH GEMINI KEY THE CHAT FEATURE USES, AND WHY IT IS ITS OWN.
 *
 * Google applies rate limits PER PROJECT, not per key — "Rate limits are
 * applied per project, not per API key" (ai.google.dev/gemini-api/docs/
 * rate-limits, read 2026-08-12). So a key is not a quota; the Cloud project
 * behind it is. Everything sharing a project shares one ceiling.
 *
 * THE PROBLEM THAT CREATES HERE. `GEMINI_API_KEY` is referenced 89 times
 * across this repo: ~25 batch scripts, ~15 Supabase edge functions, and the
 * app. All of them draw on one project. A backfill script run from a laptop
 * therefore consumes the same allowance as the live chat, and a staging test
 * consumes production's — which is exactly what happened on 2026-08-12, when
 * testing on staging took production chat down with a 429 nobody could see.
 *
 * So the chat feature reads its OWN variable, pointed at its OWN project. That
 * is the entire purpose of this module: a script can now exhaust the
 * development project without touching the chat anyone is using.
 *
 * FALLBACK, BUT NEVER SILENT. If GEMINI_CHAT_API_KEY isn't set we fall back to
 * GEMINI_API_KEY so nothing breaks mid-migration — but the caller is told the
 * fallback happened, and says so in the logs. A silent fallback would let
 * someone set up two Cloud projects, deploy, and believe the environments were
 * isolated when they were still sharing a quota. Believing you're isolated
 * when you aren't is worse than knowing you aren't: it's the state that makes
 * the next outage inexplicable.
 *
 * Pure — no network, no process.env read at import time, so it's testable.
 */

export type ChatKeySource = "GEMINI_CHAT_API_KEY" | "GEMINI_API_KEY" | "none";

export interface ResolvedChatKey {
  key: string | undefined;
  /** Which variable it came from. */
  source: ChatKeySource;
  /** True only when chat has a key of its own, i.e. its own project quota. */
  isolated: boolean;
  /** Human-readable, for logs. Never contains any part of the key. */
  note: string;
}

/**
 * Resolve the key the chat route should use.
 *
 * Takes the environment as an argument rather than reading the global, so the
 * precedence rules can be tested without mutating process.env.
 */
export function resolveChatKey(env: Record<string, string | undefined>): ResolvedChatKey {
  const dedicated = env.GEMINI_CHAT_API_KEY?.trim();
  if (dedicated) {
    return {
      key: dedicated,
      source: "GEMINI_CHAT_API_KEY",
      isolated: true,
      note: "chat is using its own key and therefore its own project quota",
    };
  }

  const shared = env.GEMINI_API_KEY?.trim();
  if (shared) {
    return {
      key: shared,
      source: "GEMINI_API_KEY",
      isolated: false,
      note:
        "GEMINI_CHAT_API_KEY is not set — chat has fallen back to the shared GEMINI_API_KEY and is competing for quota with every script and edge function on that project",
    };
  }

  return {
    key: undefined,
    source: "none",
    isolated: false,
    note: "neither GEMINI_CHAT_API_KEY nor GEMINI_API_KEY is set on this environment",
  };
}

/**
 * A fingerprint safe to put in a log line.
 *
 * Enough to confirm which key an environment picked up — the thing you
 * actually want to check after a deploy — without ever writing the key. Uses
 * the last 4 characters only: the leading characters of a Google API key are
 * a fixed, non-identifying prefix (`AIzaSy…`, `AQ.Ab8…`), so they'd
 * distinguish nothing while still being part of the secret.
 */
export function keyFingerprint(key: string | undefined): string {
  if (!key) return "none";
  if (key.length < 8) return "invalid";
  return `…${key.slice(-4)}`;
}
