import { readFileSync } from "node:fs";
import * as gmail from "@/lib/gmail";
import { PROFILES } from "@/lib/newsdesk-config";
import { missingMaterial } from "@/lib/video-agent/materials";
import { interpret, NoBriefError, type InterpretInput } from "./interpret";
import { geminiInterpreter } from "./gemini";
import { planBroll, proposalEmail } from "./propose";
import { mintNonce, verifyConsent, overDailyLimit, type DayUsage } from "./consent";

/**
 * THE STAGES AFTER INTAKE — interpret, propose, and consent.
 *
 * Split out of the route so each one is callable and testable on its own, which
 * is how every step in this repo's video pipeline got debugged. The route
 * orchestrates; the decisions live here.
 */

/** The voice rules the spec must be written in. Read from the file, not copied. */
function voiceSummary(): string {
  const src = readFileSync("lib/voice-dna.ts", "utf8");
  const i = src.indexOf("export const VOICE_SUMMARY");
  const a = src.indexOf("`", i) + 1;
  return src.slice(a, src.indexOf("`", a)).slice(0, 6000);
}

/** Every tag the library already holds, so the model prefers reuse. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function libraryTags(db: any): Promise<string[]> {
  const { data } = await db.from("broll_assets").select("tags").limit(500);
  const all = new Set<string>();
  for (const r of data ?? []) for (const t of r.tags ?? []) all.add(t);
  return [...all].sort();
}

/** What has already been spent today, for the ceiling. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function todayUsage(db: any): Promise<DayUsage> {
  const since = new Date(); since.setHours(0, 0, 0, 0);
  const { data } = await db
    .from("video_requests")
    .select("estimated_cost_usd,render_started_at")
    .gte("render_started_at", since.toISOString());
  const rows = data ?? [];
  return {
    renders: rows.length,
    usd: rows.reduce((a: number, r: { estimated_cost_usd: number | null }) => a + Number(r.estimated_cost_usd ?? 0), 0),
  };
}

export interface StageResult { ok: boolean; note: string; revision?: boolean }

/**
 * A 'received' row becomes a 'proposed' one: read it, write a spec, price it,
 * and send the proposal with a live nonce.
 *
 * THE CEILING IS CHECKED BEFORE THE PROPOSAL GOES OUT, not after the reply comes
 * back. Proposing something that will be refused on approval wastes the reader's
 * attention and teaches them the codes do not mean anything.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function proposeForRow(db: any, row: any, opts: { quietOnNoBrief?: boolean } = {}): Promise<StageResult> {
  const attachments = (row.attachments ?? []) as Array<Record<string, unknown>>;
  const input: InterpretInput = {
    subject: row.subject ?? "",
    body: row.body_text ?? "",
    imageUrls: attachments.filter((a) => /^image\//i.test(String(a.mimeType)) && a.url).map((a) => String(a.url)),
    videoFilenames: attachments.filter((a) => /^video\//i.test(String(a.mimeType))).map((a) => String(a.filename)),
    availableTags: await libraryTags(db),
  };

  let interpreted;
  try {
    interpreted = await interpret(input, voiceSummary(), geminiInterpreter());
  } catch (err) {
    /*
     * AN EMAIL THAT IS NOT A REQUEST STILL GETS AN ANSWER. Silence is the worst
     * reply here: from the sender's side a mail that was read and declined looks
     * exactly like one that never arrived, so the next move is to send it again.
     */
    if (err instanceof NoBriefError) {
      /*
       * A REVISION THAT TURNS OUT NOT TO BE ONE STAYS SILENT. This path is also
       * reached from an ordinary reply on a still-proposed job ("thanks", "ok"),
       * and answering that with the requirements table would talk over someone
       * who is not asking for anything.
       */
      if (opts.quietOnNoBrief) return { ok: false, note: "reply carried no new brief" };
      await gmail.replyInThread({
        threadId: row.gmail_thread_id, to: row.from_address,
        subject: `Re: ${row.subject}`, inReplyTo: row.gmail_message_id,
        body: [
          `I read this one but did not propose a video, because ${err.message}`,
          "",
          `Tell me what you want made and I will come back with a spec. Useful things to say: which format,`,
          `who it is for, and the point you want to land.`,
          "",
          `WHAT EACH FORMAT NEEDS FROM YOU`,
          `  hot take    nothing but the argument`,
          `  news desk   the article screenshot attached`,
          `  reaction    the clip attached, or a Drive link to it`,
          `  lookbook    a 2x3 grid image attached, plus the six style names`,
          `  data reel   THE FIGURE ITSELF, stated in the email`,
          "",
          /*
           * THE DATA REEL LINE IS THE ONE THAT NEEDS EXPLAINING, because "do
           * some data reels on data we have not shared" is the natural way to
           * ask and it is the one thing this cannot do. Choosing a figure means
           * checking what has already run and whether a column means what its
           * name suggests — two figures were rejected on exactly that ground the
           * day this was built. Saying only "no" would read as a limitation
           * rather than a deliberate line.
           */
          `On data reels: I will not go and find a figure for you here. Picking one means checking what has`,
          `already run and whether a number means what it looks like it means, and getting that wrong puts a`,
          `false claim on screen under a source line. Either state the figure, or ask me in a live session and`,
          `I will do the analysis properly and come back with candidates.`,
        ].join("\n"),
      });
      await db.from("video_requests").update({ status: "rejected", error_text: `no brief: ${err.message}` }).eq("id", row.id);
      return { ok: false, note: `no brief: ${err.message}` };
    }
    throw err;
  }
  const { request, reasoning, estimate } = interpreted;

  const usage = await todayUsage(db);
  const limit = overDailyLimit(usage, estimate.usd);
  if (limit.over) {
    await gmail.replyInThread({
      threadId: row.gmail_thread_id, to: row.from_address,
      subject: `Re: ${row.subject}`, inReplyTo: row.gmail_message_id,
      body: `I read this one and did not propose it, because ${limit.reason}.\n\nNothing was rendered and nothing was spent. Send it again tomorrow, or reply here and I will hold it.`,
    });
    await db.from("video_requests").update({ status: "rejected", error_text: `${limit.gate} limit: ${limit.reason}` }).eq("id", row.id);
    return { ok: false, note: `refused: ${limit.reason}` };
  }

  /*
   * B-roll planning only means anything for a spec. A Data Reel is an animated
   * card and a Lookbook is a pan across one supplied image; neither cuts away
   * to footage, so there is nothing to search the library for.
   */
  /*
   * NOTHING IS PROPOSED THAT CANNOT BE RENDERED. The worker checks this too,
   * but only once a code comes back — far too late, because by then the sender
   * has read a plan built on material that does not exist.
   */
  const missing = missingMaterial(request, row.attachments ?? []);
  if (missing.length) {
    await gmail.replyInThread({
      threadId: row.gmail_thread_id, to: row.from_address,
      subject: `Re: ${row.subject}`, inReplyTo: row.gmail_message_id,
      body: [
        `I did not propose this one, because ${missing.join("; and ")}.`,
        "",
        `I have not guessed at what was missing. Send it again with the file attached and I will come back`,
        `with a spec and a code.`,
      ].join("\n"),
    });
    await db.from("video_requests").update({
      status: "rejected", error_text: `missing material: ${missing.join("; ")}`,
    }).eq("id", row.id);
    return { ok: false, note: `refused: ${missing.join("; ")}` };
  }

  const broll = request.kind === "spec" ? await planBroll(db, request.spec) : [];
  const { code, expiresAt } = mintNonce();
  const body = proposalEmail({
    request, estimate, reasoning, broll, code,
    creditsPerClip: request.kind === "spec" ? PROFILES[request.spec.profile].broll.creditsPerClip : 0,
  });

  const sent = await gmail.replyInThread({
    threadId: row.gmail_thread_id, to: row.from_address,
    subject: `Re: ${row.subject}`, inReplyTo: row.gmail_message_id, body,
  });

  await db.from("video_requests").update({
    status: "proposed",
    /*
     * The whole request is stored, not just a spec — the worker branches on
     * `kind` to pick a renderer, and a column that only ever held one shape
     * would have to be guessed at by the thing reading it.
     */
    proposed_spec: request,
    estimated_cost_usd: estimate.usd,
    consent_nonce: code,
    consent_nonce_expires_at: expiresAt,
    proposal_sent_at: new Date().toISOString(),
    consent_message_id: sent?.id ?? null,
  }).eq("id", row.id);

  const what = request.kind === "spec" ? request.spec : request.kind === "card" ? request.card : request.grid;
  const kind = request.kind === "spec" ? request.spec.profile : request.kind === "card" ? "figure" : "lookbook";
  return { ok: true, note: `proposed ${kind} "${what.title}" at $${estimate.usd.toFixed(2)}` };
}

/**
 * A reply arrived on a proposed job. Approve only on a live, unspent, correctly
 * quoted code — and burn the nonce in the same update that approves, so a
 * duplicate delivery of the same reply cannot approve twice.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function consentForRow(db: any, row: any, replyBody: string, replyMessageId: string): Promise<StageResult> {
  const verdict = verifyConsent(row, replyBody);
  if (!verdict.ok) {
    if (verdict.reason === "no-code-in-reply") {
      /*
       * NOT silence — that was the bug. This fires on every reply that is not
       * the code, and those split in two: "thanks" and "change the hook". The
       * first deserves no answer; the second is a REVISION, and dropping it is
       * how a real request to change the hairstyles vanished with no reply.
       *
       * So the caller re-interprets it. A new brief supersedes the proposal
       * with a fresh code; anything else stays quiet and leaves this one live.
       */
      return { ok: false, revision: true, note: "reply carried no code — treating it as a possible revision" };
    }

    const why = {
      expired: `that code had already expired — they are good for an hour`,
      "wrong-code": `that code did not match the one I sent for this job`,
      "already-used": `that code had already been used once, and each one works once`,
      "no-nonce": `there is no live code on this job`,
    }[verdict.reason];
    await gmail.replyInThread({
      threadId: row.gmail_thread_id, to: row.from_address,
      subject: `Re: ${row.subject}`, inReplyTo: replyMessageId,
      body: `I did not render that one, because ${why}.\n\nNothing was spent. Reply here with what you want and I will send a fresh proposal with a new code.`,
    });
    await db.from("video_requests").update({
      status: verdict.reason === "expired" ? "expired" : "rejected",
      error_text: `consent refused: ${verdict.reason}`,
      processed_message_ids: [...(row.processed_message_ids ?? []), replyMessageId],
    }).eq("id", row.id);
    return { ok: false, note: `refused: ${verdict.reason}` };
  }

  /*
   * BURNING THE NONCE IS PART OF THE APPROVAL, and the .is() guard makes it
   * atomic: if a second delivery of the same reply races this, only one update
   * matches a row whose consumed_at is still null.
   */
  const { data: won } = await db.from("video_requests").update({
    status: "approved",
    consent_nonce_consumed_at: new Date().toISOString(),
    processed_message_ids: [...(row.processed_message_ids ?? []), replyMessageId],
  }).eq("id", row.id).is("consent_nonce_consumed_at", null).select("id");

  if (!won?.length) return { ok: false, note: "another delivery already consumed this code" };

  await gmail.replyInThread({
    threadId: row.gmail_thread_id, to: row.from_address,
    subject: `Re: ${row.subject}`, inReplyTo: replyMessageId,
    body: `Approved. It is queued for the renderer, which runs locally — I will reply here when it is done.\n\nEstimated $${Number(row.estimated_cost_usd ?? 0).toFixed(2)} of HeyGen.`,
  });
  return { ok: true, note: "approved" };
}
