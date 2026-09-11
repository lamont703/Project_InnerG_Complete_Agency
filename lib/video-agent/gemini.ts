import { resolveEditorKey } from "@/lib/gemini-keys";
import { withRetry } from "@/lib/video-editor/retry.js";
import type { Interpreter } from "./interpret";

/**
 * The Gemini side of the interpret seam.
 *
 * gemini-3.1-flash-lite is the house standard — six call sites, priced in
 * lib/ai-usage.ts, and it reads images, which this step needs because the
 * headline screenshot IS the brief for a News Desk.
 *
 * IMAGES ARE FETCHED AND INLINED rather than passed by URL. The Gemini REST
 * API takes inline_data with base64 bytes; it does not fetch a URL for you, and
 * a silently ignored image would produce a spec written blind to the very
 * screenshot the video is about.
 */
const MODEL = "gemini-3.1-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/** Images are small (screenshots), but a runaway attachment must not blow the request. */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

async function inlineImage(url: string): Promise<{ inline_data: { mime_type: string; data: string } } | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const type = res.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_IMAGE_BYTES) return null;
  return { inline_data: { mime_type: type, data: buf.toString("base64") } };
}

export function geminiInterpreter(): Interpreter {
  return {
    name: MODEL,
    async run(prompt: string, imageUrls: string[]) {
      /*
       * THE EDITOR KEY, NOT THE CHAT ONE. lib/gemini-keys.ts splits keys by
       * PURPOSE so one surface running hot cannot exhaust another's project
       * quota — the same split scripts/render_queued.js and edit_avatar.js use.
       * This step is editorial work on our own content, so it belongs to the
       * editor budget.
       */
      const { key, source } = resolveEditorKey(process.env);
      if (!key) throw new Error(`no Gemini editor key resolved (source: ${source})`);

      const parts: Array<Record<string, unknown>> = [{ text: prompt }];
      for (const url of imageUrls.slice(0, 4)) {
        const part = await inlineImage(url);
        if (part) parts.push(part);
      }

      /*
       * A 503 here is "high demand", not a bad request — it killed a propose run
       * outright once. lib/video-editor/retry.js already classifies exactly this
       * for the render path; one copy, both callers.
       */
      const res = await withRetry(() => fetch(`${ENDPOINT}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          // Low temperature: this returns a JSON contract, not prose.
          generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
        }),
      }).then(async (r) => {
        if (r.status === 503 || r.status === 429) {
          throw new Error(`gemini ${r.status}: high demand`);
        }
        return r;
      }));
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(`gemini ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
      }
      const text = body?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ?? "";
      if (!text.trim()) throw new Error(`gemini returned no text: ${JSON.stringify(body).slice(0, 300)}`);
      return text;
    },
  };
}
