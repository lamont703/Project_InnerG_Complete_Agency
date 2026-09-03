import { describe, it } from "vitest";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { interpret } from "@/lib/video-agent/interpret";
import { geminiInterpreter } from "@/lib/video-agent/gemini";
import { planBroll, proposalEmail } from "@/lib/video-agent/propose";
import { PROFILES } from "@/lib/newsdesk-config";

function voice(): string {
  const src = readFileSync("lib/voice-dna.ts", "utf8");
  const i = src.indexOf("export const VOICE_SUMMARY");
  const a = src.indexOf("`", i) + 1;
  return src.slice(a, src.indexOf("`", a)).slice(0, 6000);
}

/**
 * A MANUAL HARNESS, NOT A TEST — it calls Gemini and reads the live table, so it
 * is opt-in. `npx vitest run` must stay free and offline-safe; a suite that
 * quietly bills on every run is a suite people stop running.
 *
 *   VIDEO_AGENT_PROBE=1 npx vitest run lib/video-agent/__probe.test.ts
 *
 * It sends no email and renders nothing. It prints the proposal that WOULD go
 * out, which is the only way to judge the spec before a human is asked to
 * approve one.
 */
describe("dry probe — no email sent, no render", () => {
  it.skipIf(!process.env.VIDEO_AGENT_PROBE)("interprets the real received row", async () => {
    /*
     * A client built HERE, not @/lib/supabase/admin. ESM hoists imports above
     * dotenv.config(), so that module reads its env before .env.local has been
     * loaded and throws "supabaseUrl is required" inside vitest.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any;
    const { data } = await db.from("video_requests").select("*").eq("status", "received").order("received_at").limit(1);
    const row = data?.[0];
    if (!row) { console.log("  no received rows"); return; }

    const atts = (row.attachments ?? []) as Array<Record<string, unknown>>;
    console.log(`\n  SUBJECT: ${row.subject}`);
    console.log(`  BODY:    ${String(row.body_text).replace(/\s+/g, " ").slice(0, 160)}`);
    console.log(`  images:  ${atts.filter((a) => /^image\//i.test(String(a.mimeType))).length}   video: ${atts.filter((a) => /^video\//i.test(String(a.mimeType))).length}`);

    const { data: tagRows } = await db.from("broll_assets").select("tags").limit(500);
    const tags = [...new Set((tagRows ?? []).flatMap((r: { tags: string[] }) => r.tags ?? []))].sort() as string[];

    try {
      const out = await interpret({
        subject: row.subject ?? "",
        body: row.body_text ?? "",
        imageUrls: atts.filter((a) => /^image\//i.test(String(a.mimeType)) && a.url).map((a) => String(a.url)),
        videoFilenames: atts.filter((a) => /^video\//i.test(String(a.mimeType))).map((a) => String(a.filename)),
        availableTags: tags,
      }, voice(), geminiInterpreter());

      const broll = out.request.kind === "spec" ? await planBroll(db, out.request.spec) : [];
      console.log("\n" + proposalEmail({
        request: out.request, estimate: out.estimate, reasoning: out.reasoning, broll,
        code: "000000",
        creditsPerClip: out.request.kind === "spec" ? PROFILES[out.request.spec.profile].broll.creditsPerClip : 0,
      }));
    } catch (err) {
      console.log(`\n  INTERPRET FAILED: ${(err as Error).message}`);
    }
  }, 120_000);
});
