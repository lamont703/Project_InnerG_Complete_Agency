import { describe, expect, it } from "vitest";
import { resolveChatKey, resolveEditorKey, resolveKey, keyFingerprint } from "./gemini-keys";

describe("resolveEditorKey", () => {
  it("uses the editor's own key when it has one", () => {
    const r = resolveEditorKey({ GEMINI_EDITOR_API_KEY: "edit-key", GEMINI_API_KEY: "shared" });
    expect(r.key).toBe("edit-key");
    expect(r.source).toBe("GEMINI_EDITOR_API_KEY");
    expect(r.isolated).toBe(true);
  });

  /*
   * The fallback keeps the pipeline running mid-migration, but it must announce
   * itself. Believing you are isolated when you are not is the state that makes
   * the next outage inexplicable.
   */
  it("falls back to the shared key and says so", () => {
    const r = resolveEditorKey({ GEMINI_API_KEY: "shared" });
    expect(r.key).toBe("shared");
    expect(r.source).toBe("GEMINI_API_KEY");
    expect(r.isolated).toBe(false);
    expect(r.note).toMatch(/competing for quota/);
  });

  it("reports having nothing rather than returning an empty string", () => {
    const r = resolveEditorKey({});
    expect(r.key).toBeUndefined();
    expect(r.source).toBe("none");
  });

  it("ignores a variable that is only whitespace", () => {
    const r = resolveEditorKey({ GEMINI_EDITOR_API_KEY: "   ", GEMINI_API_KEY: "shared" });
    expect(r.source).toBe("GEMINI_API_KEY");
  });
});

describe("resolveChatKey still behaves exactly as before", () => {
  it("prefers the chat key", () => {
    const r = resolveChatKey({ GEMINI_CHAT_API_KEY: "chat-key", GEMINI_API_KEY: "shared" });
    expect(r.key).toBe("chat-key");
    expect(r.source).toBe("GEMINI_CHAT_API_KEY");
    expect(r.isolated).toBe(true);
  });

  it("falls back, not silently", () => {
    const r = resolveChatKey({ GEMINI_API_KEY: "shared" });
    expect(r.source).toBe("GEMINI_API_KEY");
    expect(r.isolated).toBe(false);
  });
});

describe("the purposes do not borrow from each other", () => {
  /*
   * Google rate limits per PROJECT. Letting the editor reach for the chat key
   * would spend the live assistant's allowance on a background render — the
   * exact outage lib/gemini-keys-core.js documents.
   */
  it("the editor never picks up the chat key", () => {
    const r = resolveEditorKey({ GEMINI_CHAT_API_KEY: "chat-key" });
    expect(r.key).toBeUndefined();
  });

  it("chat never picks up the editor key", () => {
    const r = resolveChatKey({ GEMINI_EDITOR_API_KEY: "edit-key" });
    expect(r.key).toBeUndefined();
  });
});

describe("keyFingerprint", () => {
  it("shows only the last four characters", () => {
    expect(keyFingerprint("AIzaSyABCDEFGH1234")).toBe("…1234");
  });

  it("never leaks a short or missing key", () => {
    expect(keyFingerprint(undefined)).toBe("none");
    expect(keyFingerprint("abc")).toBe("invalid");
  });
});

describe("resolveKey", () => {
  it("refuses a purpose nobody registered", () => {
    expect(() => resolveKey("billing" as never, {})).toThrow(/unknown Gemini purpose/);
  });
});
