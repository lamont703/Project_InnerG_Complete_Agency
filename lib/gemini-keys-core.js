/**
 * WHICH GEMINI KEY EACH PURPOSE USES, AND WHY EACH HAS ITS OWN.
 *
 * Google applies rate limits PER PROJECT, not per key — "Rate limits are
 * applied per project, not per API key" (ai.google.dev/gemini-api/docs/
 * rate-limits, read 2026-08-12). So a key is not a quota; the Cloud project
 * behind it is. Everything sharing a project shares one ceiling.
 *
 * THAT IS THE WHOLE POINT AND THE EASIEST THING TO GET WRONG. Minting a second
 * key inside the SAME project isolates nothing. It looks like a fix, the
 * variable name says "dedicated", and the next exhaustion is identical.
 * Isolation requires a separate Cloud project, and the key is only how you
 * point at it.
 *
 * `GEMINI_API_KEY` is referenced ~89 times across this repo: batch scripts,
 * edge functions and the app. All of them draw on one project. That is how a
 * staging test took production chat down on 2026-08-12, and how the video
 * editing agent exhausted the day's allowance mid-pipeline — after a HeyGen
 * render had already been paid for.
 *
 * WHY PLAIN JAVASCRIPT. scripts/edit_avatar.js is CommonJS and cannot import
 * the TypeScript. lib/gemini-keys.ts is a typed re-export of this file, so the
 * app, its tests and the scripts all resolve keys the same way. Same reasoning
 * as lib/video-editor/ranges-core.js and lib/video-type.js.
 *
 * FALLBACK, BUT NEVER SILENT. A purpose with no key of its own falls back to
 * the shared one so nothing breaks mid-migration, and the caller is TOLD. A
 * silent fallback lets someone set up two projects, deploy, and believe the
 * environments are isolated while they still share a ceiling. Believing you are
 * isolated when you are not is worse than knowing you are not: it is the state
 * that makes the next outage inexplicable.
 *
 * Pure — no network, and the environment is passed in rather than read at
 * import time, so precedence is testable without mutating process.env.
 */

/**
 * One entry per purpose: the variable it owns, and what it is for.
 *
 * Add a purpose here rather than reading process.env directly somewhere new.
 * The scattered reads are the problem this module exists to end.
 */
const PURPOSES = {
  chat: {
    variable: "GEMINI_CHAT_API_KEY",
    label: "chat",
    /* The live assistant. A background job must never spend its allowance. */
    competingWith: "every script and edge function on the shared project",
  },
  editor: {
    variable: "GEMINI_EDITOR_API_KEY",
    label: "the video editing agent",
    /*
     * IT RUNS AFTER MONEY HAS BEEN SPENT. The agent is asked for an edit plan
     * once a HeyGen avatar is already rendered and paid for, so an exhausted
     * quota does not merely fail — it fails holding a receipt. That is the
     * argument for its own project: the editor should be able to run out
     * without any other feature noticing, and vice versa.
     */
    competingWith: "every script and edge function on the shared project",
  },
};

/**
 * @param {"chat"|"editor"} purpose
 * @param {Record<string,string|undefined>} env
 */
function resolveKey(purpose, env) {
  const spec = PURPOSES[purpose];
  if (!spec) throw new Error(`unknown Gemini purpose "${purpose}"`);
  const e = env ?? {};

  const dedicated = e[spec.variable]?.trim();
  if (dedicated) {
    return {
      key: dedicated,
      source: spec.variable,
      isolated: true,
      note: `${spec.label} is using its own key and therefore its own project quota`,
    };
  }

  const shared = e.GEMINI_API_KEY?.trim();
  if (shared) {
    return {
      key: shared,
      source: "GEMINI_API_KEY",
      isolated: false,
      note:
        `${spec.variable} is not set — ${spec.label} has fallen back to the shared ` +
        `GEMINI_API_KEY and is competing for quota with ${spec.competingWith}`,
    };
  }

  return {
    key: undefined,
    source: "none",
    isolated: false,
    note: `neither ${spec.variable} nor GEMINI_API_KEY is set on this environment`,
  };
}

/** Unchanged behaviour for the chat route; now one purpose among several. */
function resolveChatKey(env) {
  return resolveKey("chat", env);
}

/** The video editing agent's key. */
function resolveEditorKey(env) {
  return resolveKey("editor", env);
}

/**
 * A fingerprint safe to put in a log line.
 *
 * Enough to confirm which key an environment picked up — the thing you actually
 * want to check after a deploy — without ever writing the key. Last 4 characters
 * only: the leading characters of a Google API key are a fixed, non-identifying
 * prefix (`AIzaSy…`, `AQ.Ab8…`), so they would distinguish nothing while still
 * being part of the secret.
 */
function keyFingerprint(key) {
  if (!key) return "none";
  if (key.length < 8) return "invalid";
  return `…${key.slice(-4)}`;
}

module.exports = { PURPOSES, resolveKey, resolveChatKey, resolveEditorKey, keyFingerprint };
