import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleInstagramDm } from "@/lib/instagram-dm-agent";

/**
 * Instagram webhook: comments, mentions and messages.
 *
 * WHY THIS IS THE POINT OF THE WHOLE TAGGING EXPERIMENT. A scraped handle
 * cannot be verified by looking at it — only a response proves the account
 * belongs to the business. This endpoint is where that response arrives, and
 * where it gets written down. Without it, "did tagging work?" is answerable
 * only by scrolling the app and remembering.
 *
 * A COMMENT FROM A TAGGED HANDLE CONFIRMS THAT HANDLE. That is the loop: tag,
 * they answer, confirmed_at is stamped by evidence instead of assertion.
 *
 * SIGNATURE VERIFIED, NOT ASSUMED. Meta signs every delivery with
 * X-Hub-Signature-256 over the raw body. Skipping it leaves a public endpoint
 * that any stranger can post fabricated comments to — and those fabrications
 * would confirm handles, which is precisely the data this exists to protect.
 * The raw text is read once and hashed before parsing, because re-serialising
 * JSON changes the bytes and breaks the comparison.
 */

export const dynamic = "force-dynamic";

/** Meta's subscription handshake. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const mode = u.searchParams.get("hub.mode");
  const token = u.searchParams.get("hub.verify_token");
  const challenge = u.searchParams.get("hub.challenge");

  const expected = process.env.META_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected) {
    // Must be echoed as bare text; JSON fails the handshake.
    return new Response(challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

function signatureValid(raw: string, header: string | null): boolean {
  const secret = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!signatureValid(raw, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let payload: any = {};
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  const admin = createAdminClient();
  const rows: any[] = [];

  for (const entry of payload.entry || []) {
    // Comments and mentions arrive as `changes`; DMs arrive as `messaging`.
    for (const change of entry.changes || []) {
      const v = change.value || {};
      rows.push({
        kind: change.field === "mentions" ? "mention" : change.field === "comments" ? "comment" : "other",
        sender_id: v.from?.id || null,
        username: v.from?.username || null,
        media_id: v.media?.id || v.media_id || null,
        comment_id: v.id || v.comment_id || null,
        text_body: v.text || null,
        raw: change,
      });
    }
    for (const m of entry.messaging || []) {
      rows.push({
        kind: "message",
        sender_id: m.sender?.id || null,
        username: null,
        media_id: null,
        comment_id: m.message?.mid || null,
        text_body: m.message?.text || null,
        raw: m,
      });
    }
  }

  /*
   * ANSWER THE DMs.
   *
   * Storing was the whole job until the bio started promising an answer.
   * Comments and mentions are still recorded and left alone — a private reply
   * to a comment is a different mechanism with a different budget, and nothing
   * has asked for it yet.
   *
   * ECHOES ARE SKIPPED. Meta delivers our OWN outbound messages back to this
   * webhook as message events. Without the is_echo check the agent would read
   * its own reply as a new question, answer it, read that, and run until the
   * rate limit stopped it — an infinite loop conducted in public, in someone
   * else's inbox.
   *
   * FAILURES DO NOT FAIL THE WEBHOOK. A non-2xx makes Meta redeliver, which
   * would re-answer a question already answered and spend the person's daily
   * allowance twice on it. Every path inside the handler returns rather than
   * throws for the same reason; this is the backstop.
   */
  const replies: any[] = [];
  for (const entry of payload.entry || []) {
    for (const m of entry.messaging || []) {
      if (m.message?.is_echo) continue;
      const senderId = m.sender?.id;
      const text = m.message?.text;
      if (!senderId || !text) continue;
      try {
        replies.push(
          await handleInstagramDm({ senderId, text, mid: m.message?.mid ?? null })
        );
      } catch (err: any) {
        console.warn("[instagram-webhook] dm handler threw:", err?.message);
      }
    }
  }

  if (!rows.length) return NextResponse.json({ ok: true, stored: 0, replies });

  // ignoreDuplicates: Meta retries deliveries, and a retry must not read as a
  // second comment — which would double-count the only engagement signal we get.
  const { error } = await (admin.from("instagram_events") as any)
    .upsert(rows, { onConflict: "kind,comment_id,sender_id,media_id", ignoreDuplicates: true });
  if (error) console.error("[instagram-webhook] store failed:", error.message);

  /*
   * THE CONFIRMATION. A handle that just interacted with us is a handle that
   * exists and is watching — which is the only evidence available that we
   * tagged the right account. Scoped to handles we actually hold, so a random
   * commenter does not create rows.
   */
  for (const r of rows) {
    if (!r.username) continue;
    await (admin.from("entity_social_profiles") as any)
      .update({ confirmed_at: new Date().toISOString(), confirmed_via: "reply" })
      .eq("platform", "instagram")
      .ilike("handle", r.username)
      .is("confirmed_at", null);
  }

  return NextResponse.json({ ok: true, stored: rows.length, replies });
}
