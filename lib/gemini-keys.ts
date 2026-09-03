/**
 * The typed surface of the Gemini key resolver. The implementation and all of
 * the reasoning are in gemini-keys-core.js, which is plain JavaScript so the
 * CommonJS scripts can share it instead of keeping their own copy.
 *
 * The short version, because it is the thing people get wrong: Google rate
 * limits PER PROJECT, not per key. A second key inside the same project
 * isolates nothing.
 */
import core from "./gemini-keys-core.js";

export type GeminiPurpose = "chat" | "editor";
export type ChatKeySource = "GEMINI_CHAT_API_KEY" | "GEMINI_API_KEY" | "none";
export type EditorKeySource = "GEMINI_EDITOR_API_KEY" | "GEMINI_API_KEY" | "none";

export interface ResolvedKey {
  key: string | undefined;
  /** Which variable it came from. */
  source: string;
  /** True only when the purpose has a key of its own, i.e. its own project quota. */
  isolated: boolean;
  /** Human-readable, for logs. Never contains any part of the key. */
  note: string;
}

/** Kept for the callers that predate the purpose split. */
export type ResolvedChatKey = ResolvedKey & { source: ChatKeySource };

/*
 * ASSERTED, NOT INFERRED. The implementation is plain JavaScript, so TypeScript
 * sees `source: string` and cannot narrow it to the literal union the callers
 * were written against. The narrowing is real — the core returns exactly the
 * variable names below and nothing else — and lib/gemini-keys.test.ts asserts
 * each one, so the assertion is checked rather than merely claimed.
 */
export const resolveKey = core.resolveKey as (
  purpose: GeminiPurpose,
  env: Record<string, string | undefined>,
) => ResolvedKey;

export const resolveChatKey = core.resolveChatKey as (
  env: Record<string, string | undefined>,
) => ResolvedChatKey;

export const resolveEditorKey = core.resolveEditorKey as (
  env: Record<string, string | undefined>,
) => ResolvedKey & { source: EditorKeySource };

export const keyFingerprint = core.keyFingerprint as (key: string | undefined) => string;
