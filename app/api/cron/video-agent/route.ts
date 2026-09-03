import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { proposeForRow, consentForRow } from "@/lib/video-agent/stages";

// lib/gmail.js is CommonJS so the local renderer scripts can use it too — see
// its header. Next resolves it fine; the `require` shape is what keeps one copy.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const gmail = require("@/lib/gmail.js");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const driveLinks = require("@/lib/drive-links.js");

/**
 * THE VIDEO REQUEST AGENT — intake half.
 *
 * Reads claudedawg113@gmail.com, turns each new conversation into a row in
 * public.video_requests, and files the attachments. It does NOT interpret
 * anything and it does NOT spend money. That is deliberate and it is the same
 * split public.booking_emails already runs on: receiving must not fail because
 * interpreting did, and a stored message can be re-read a hundred times while
 * the prompt is tuned, where a dropped one is gone.
 *
 * ONE THREAD IS ONE JOB. Gmail assigns every conversation a stable threadId, so
 * four concurrent video requests need no threading logic of ours — four
 * threads, four rows, and the unique constraint on gmail_thread_id means a
 * reply can never open a second job for the same conversation.
 *
 * FAIL CLOSED ON THE SENDER. Anything can arrive at a public mailbox, and a job
 * row is the first step on a path that ends in a paid render. With
 * VIDEO_AGENT_ALLOWED_SENDERS unset this route processes NOTHING and says so,
 * rather than defaulting to a hardcoded address that would be wrong in someone
 * else's environment and invisible in this one.
 *
 * THE ALLOWLIST IS NOT THE SECURITY CONTROL, THOUGH. A From: header is
 * trivially forged, so it is a spam filter, not consent. Nothing here may
 * authorise spending; that is the nonce loop's job, and it is the reason this
 * route stops at 'received'.
 *
 * WHY NOT is:unread. See the comment on video_requests.processed_message_ids —
 * a human opening the mail in Gmail would clear that flag and the request would
 * never be seen. Handled-ness is tracked per message, in the database.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that var is set. */
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** At most this many messages per run. A backlog must never become a burst. */
const BATCH = 20;

/**
 * How far back to look. Bounded so that a mailbox left unattended for a month
 * cannot produce a hundred jobs on the first run after a fix.
 */
const WINDOW = "newer_than:14d";

/** Only these become job attachments. Anything else is recorded and skipped. */
const KEEP_MIME = /^(image\/(jpeg|png|webp|gif|heic)|video\/(mp4|quicktime|webm))$/i;

/**
 * Per-file ceiling. Gmail itself will hand over larger, but an attachment is
 * read fully into memory here before it is written to storage, and a function
 * that OOMs takes the whole poll down rather than skipping one file.
 */
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const LABELS = {
  received: "video-agent/received",
} as const;

/** "Lamont <a@b.com>" -> "a@b.com". Gmail gives either shape. */
function bareAddress(from: string | null): string {
  if (!from) return "";
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

/**
 * The addresses whose mail becomes a job. Comma-separated.
 *
 * ENTRIES MUST LOOK LIKE ADDRESSES, and that check earns its place: this was
 * first set to `true`, as though it were a feature flag. That is the worst
 * possible failure shape — the variable is present, the route reports ok:true,
 * every message increments skipped_sender, and nothing anywhere says the
 * allowlist cannot match a sender. Same asymmetry as an unverified user-agent
 * token in lib/robots-rules.ts: the rule looks right and is inert.
 *
 * So a non-address entry is dropped here and the caller refuses loudly, rather
 * than quietly holding an allowlist that admits nobody.
 */
function allowedSenders(): { addresses: string[]; rejected: string[] } {
  const raw = (process.env.VIDEO_AGENT_ALLOWED_SENDERS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const addresses = raw.filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
  return { addresses, rejected: raw.filter((s) => !addresses.includes(s)) };
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("Unauthorized", { status: 401 });

  const { addresses: allowed, rejected } = allowedSenders();
  if (allowed.length === 0) {
    // Not an error — a refusal, and it names its own fix. Returning 200 keeps
    // Vercel from retrying a configuration problem every five minutes.
    return NextResponse.json({
      ok: false,
      reason: rejected.length
        ? `VIDEO_AGENT_ALLOWED_SENDERS holds no email addresses (got ${JSON.stringify(rejected)}) — ` +
          `it is a comma-separated list of senders, not a boolean`
        : "VIDEO_AGENT_ALLOWED_SENDERS is unset — refusing to process any mail",
    });
  }

  /*
   * `as any` matches content-metrics, tiktok-comment-sync and two others, and
   * it is forced rather than chosen: types/database.ts is still the stub
   * (`Database = Record<string, unknown>`), so supabase-js resolves every
   * table to `never` and any .insert()/.update() fails to compile. Selects
   * happen to survive, which is why this only bites on writes.
   *
   * The real fix is one command — `npx supabase gen types typescript
   * --project-id <ref> > types/database.ts`, which that file's own header asks
   * for — and it would type every table in the repo at once. Worth doing;
   * not worth doing inside this change.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const result = {
    scanned: 0,
    created: 0,
    replies_seen: 0,
    proposed: 0,
    approved: 0,
    refused: 0,
    skipped_sender: 0,
    skipped_known: 0,
    attachments_saved: 0,
    drive_deferred: 0,
    attachments_skipped: [] as string[],
    errors: [] as string[],
  };

  try {
    const receivedLabel = await gmail.ensureLabel(LABELS.received);
    /*
     * SPAM IS SEARCHED TOO, AND THIS IS NOT A LOOSENING. A real request from an
     * allowlisted sender landed in SPAM with CATEGORY_PROMOTIONS on the first
     * live test — a fresh mailbox with no sending history classifies a plain
     * text email from an unknown contact exactly that way. `in:inbox` would
     * have ignored it forever and reported a clean run, which is the worst
     * shape a bug can take: no error, no mail, no reason to look.
     *
     * It is safe because the ALLOWLIST is the filter, not the folder. Sent,
     * trash and drafts stay excluded so the agent cannot read its own proposals
     * back and treat them as requests.
     */
    const messages = await gmail.search(`{in:inbox in:spam} -in:sent -in:trash -in:draft ${WINDOW}`, { maxResults: BATCH });
    result.scanned = messages.length;

    for (const ref of messages) {
      try {
        // Cheap pre-check: is this exact message already accounted for anywhere?
        const { data: seen } = await db
          .from("video_requests")
          .select("id,status,processed_message_ids")
          .contains("processed_message_ids", [ref.id])
          .maybeSingle();
        if (seen) {
          result.skipped_known++;
          continue;
        }

        const msg = await gmail.getMessage(ref.id);
        const sender = bareAddress(msg.from);
        if (!allowed.includes(sender)) {
          result.skipped_sender++;
          continue;
        }

        // Is this a reply inside a job that already exists?
        const { data: existing } = await db
          .from("video_requests")
          .select("id,processed_message_ids")
          .eq("gmail_thread_id", msg.threadId)
          .maybeSingle();

        if (existing) {
          /*
           * A reply on a live job. Only a PROPOSED job can be approved — a
           * reply on anything else is conversation, and is counted rather than
           * acted on.
           *
           * The message id is marked processed by consentForRow ONLY when it
           * actually decides something. A reply carrying no code leaves the job
           * proposed and the message unprocessed, so a follow-up that does
           * carry the code is still seen.
           */
          result.replies_seen++;
          const { data: job } = await db
            .from("video_requests")
            .select("id,status,subject,from_address,gmail_thread_id,gmail_message_id,estimated_cost_usd,processed_message_ids,consent_nonce,consent_nonce_expires_at,consent_nonce_consumed_at")
            .eq("id", existing.id)
            .single();

          if (job?.status === "proposed") {
            const verdict = await consentForRow(db, job, msg.text || msg.html || "", msg.id);
            if (verdict.ok) result.approved++;
            else result.refused++;
          }
          continue;
        }

        // A new conversation: create the job first, so that an attachment
        // failure below leaves a visible row to retry rather than losing the
        // request entirely.
        const { data: row, error: insErr } = await db
          .from("video_requests")
          .insert({
            gmail_thread_id: msg.threadId,
            gmail_message_id: msg.id,
            from_address: sender,
            subject: msg.subject,
            body_text: msg.text || msg.html || "",
            raw: msg.raw,
            status: "received",
            processed_message_ids: [msg.id],
          })
          .select("id")
          .single();

        if (insErr) {
          // A concurrent run won the unique constraint on gmail_thread_id.
          // That is the race resolving correctly, not a failure.
          if ((insErr as { code?: string }).code === "23505") {
            result.skipped_known++;
            continue;
          }
          throw insErr;
        }

        const saved: Array<Record<string, unknown>> = [];
        for (const att of msg.attachments) {
          if (!KEEP_MIME.test(att.mimeType)) {
            result.attachments_skipped.push(`${att.filename} (${att.mimeType})`);
            continue;
          }
          if (att.sizeBytes > MAX_ATTACHMENT_BYTES) {
            result.attachments_skipped.push(`${att.filename} (${Math.round(att.sizeBytes / 1e6)}MB)`);
            continue;
          }

          const bytes = await gmail.getAttachment(msg.id, att.attachmentId);
          // entity-photos, NOT social-assets: that bucket caps at 5MB, which is
          // the same reason lib/broll-library.js gives for its choice.
          const safe = att.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `video-requests/${row.id}/${safe}`;
          const { error: upErr } = await db.storage
            .from("entity-photos")
            .upload(path, bytes, { contentType: att.mimeType, upsert: true });
          if (upErr) throw upErr;

          const { data: pub } = db.storage.from("entity-photos").getPublicUrl(path);
          saved.push({
            filename: att.filename,
            mimeType: att.mimeType,
            sizeBytes: att.sizeBytes,
            storagePath: path,
            url: pub.publicUrl,
          });
          result.attachments_saved++;
        }

        /*
         * DRIVE LINKS ARE THE NORMAL CASE, NOT A FALLBACK. Gmail converts any
         * attachment over ~25MB — and anything inserted from Drive — into a
         * link, so the first real request here arrived with an empty MIME tree
         * and both files in the body text. See lib/drive-links.js.
         *
         * WHAT GETS PULLED IN AND WHAT DOES NOT. Images come down now because
         * the model has to look at them to write a spec. Video does not: the
         * first one sent here was 112,728,164 bytes, and buffering that in a
         * serverless function does not degrade, it OOMs the whole poll. Video
         * is recorded and left in place for the local renderer, which has a
         * disk and no 300-second ceiling.
         *
         * fileId IS STORED, NOT downloadUrl. The confirm-token URL for a large
         * file carries a uuid that Drive issues per request; a renderer picking
         * the job up an hour later must re-probe by id rather than replay a
         * stale link.
         */
        for (const link of driveLinks.extractDriveLinks(msg.text || "")) {
          try {
            const probe = await driveLinks.probeDriveFile(link.fileId);
            if (!probe.ok) {
              result.attachments_skipped.push(`drive:${link.fileId} (${probe.reason})`);
              continue;
            }

            const isImage = /^image\//i.test(probe.contentType || "");
            const small = probe.sizeBytes != null && probe.sizeBytes <= MAX_ATTACHMENT_BYTES;

            if (isImage && small) {
              const bytes = await driveLinks.downloadDriveFile(probe, { maxBytes: MAX_ATTACHMENT_BYTES });
              const safe = (probe.filename || `${link.fileId}.bin`).replace(/[^a-zA-Z0-9._-]/g, "_");
              const path = `video-requests/${row.id}/${safe}`;
              const { error: upErr } = await db.storage
                .from("entity-photos")
                .upload(path, bytes, { contentType: probe.contentType, upsert: true });
              if (upErr) throw upErr;
              const { data: pub } = db.storage.from("entity-photos").getPublicUrl(path);
              saved.push({
                source: "drive",
                driveFileId: link.fileId,
                filename: probe.filename,
                mimeType: probe.contentType,
                sizeBytes: probe.sizeBytes,
                storagePath: path,
                url: pub.publicUrl,
              });
              result.attachments_saved++;
            } else {
              saved.push({
                source: "drive",
                driveFileId: link.fileId,
                filename: probe.filename,
                mimeType: probe.contentType,
                sizeBytes: probe.sizeBytes,
                viewUrl: link.viewUrl,
                // Left where it is on purpose — too big for this function to
                // hold. The renderer re-probes by driveFileId and streams it.
                fetchBy: "renderer",
              });
              result.drive_deferred++;
            }
          } catch (err) {
            result.attachments_skipped.push(`drive:${link.fileId} (${(err as Error).message})`);
          }
        }

        if (saved.length) {
          await db.from("video_requests").update({ attachments: saved }).eq("id", row.id);
        }

        await gmail.labelThread(msg.threadId, { add: [receivedLabel] });
        result.created++;
      } catch (err) {
        result.errors.push(`${ref.id}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message, ...result }, { status: 500 });
  }

  /*
   * PROPOSE STAGE, AND ONE ROW PER RUN ON PURPOSE. Each proposal is a model
   * call plus a library search plus a send; doing the whole backlog inside a
   * 300-second function is how a poll starts timing out halfway and leaving
   * rows in a state nobody can read. The cron runs every five minutes, so a
   * backlog drains on its own.
   */
  try {
    const { data: pending } = await db
      .from("video_requests")
      .select("*")
      .eq("status", "received")
      .order("received_at", { ascending: true })
      .limit(1);

    if (pending?.length) {
      const verdict = await proposeForRow(db, pending[0]);
      if (verdict.ok) result.proposed++;
      else result.refused++;
      result.errors.push(...(verdict.ok ? [] : [`propose: ${verdict.note}`]));
    }
  } catch (err) {
    // A propose failure must not lose the intake work already committed above.
    result.errors.push(`propose: ${(err as Error).message}`);
  }

  return NextResponse.json({ ok: true, ...result });
}
