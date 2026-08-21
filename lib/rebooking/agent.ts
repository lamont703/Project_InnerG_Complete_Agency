import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlSms } from "@/lib/ghl-sms";
import { sendGhlEmail } from "@/lib/ghl-email";
import { fetchRebookingQueue, CONTACT_COOLDOWN_DAYS, type DueClient } from "./queue";
import { draftMessages, BOOKING_URL, type AttachedOffer, type OptInNudge } from "./messages";
import { createHaircutOffer, hasOpenOffer, WIN_BACK_MIN_DAYS_LATE, OFFER_PERCENT } from "@/lib/offers/haircut-offer";
import { findOrCreateInvite } from "@/lib/sms-consent/store";
import { SITE_URL } from "@/lib/site";
import { logOutreach } from "./outreach-log";
import { markContacted } from "./notes";
import { bucketFor } from "./baseline";
import { isWithinSendWindow, localDateInTimezone, describeWindow, type SendWindow } from "./schedule";

/**
 * The autonomous run: decide who to message, message them, and write down every
 * decision including the ones that were "no".
 *
 * THE AUDIT TRAIL IS THE POINT, not a by-product. A log of what was sent
 * answers "what did it do" and cannot answer "why didn't it text Cymone" —
 * which is the only question anyone asks when the thing looks wrong. So every
 * client considered gets a row, skips included, with a machine-readable reason.
 *
 * ORDER OF THE GUARDS MATTERS. The cheap, total ones run first: if the agent is
 * disabled or it is 3am, the run halts before a single client is loaded, before
 * Shopify is called, and before anything can go wrong in a loop. Per-client
 * checks only run for a client the agent is already allowed to contact.
 *
 * EVERY GUARD FAILS CLOSED. Missing settings row, unreadable settings, an
 * unparseable window — all of them halt the run rather than falling back to a
 * default that sends. The cost of not sending for a day is one day; the cost of
 * sending wrongly is a client relationship worth four figures a year.
 */

export interface AgentSettings {
  enabled: boolean;
  dryRun: boolean;
  dailyCap: number;
  channels: "sms" | "sms_and_email";
  window: SendWindow;
}

export type SkipReason =
  | "agent_disabled"
  | "outside_send_window"
  | "daily_cap_reached"
  | "no_consented_channel"
  | "email_sending_off"
  | "recently_contacted"
  | "set_aside_by_note"
  | "send_failed"
  | "no_settings";

export interface RunDecision {
  customerId: string | null;
  clientName: string | null;
  decision: "sent" | "would_send" | "skipped" | "failed" | "run_halted";
  reason: SkipReason | null;
  channel: "sms" | "email" | null;
  daysOverdue: number | null;
  annualValue: number | null;
  messageBody: string | null;
  error: string | null;
}

export interface RunResult {
  runId: string;
  halted: boolean;
  haltReason: SkipReason | null;
  considered: number;
  sent: number;
  wouldSend: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
  decisions: RunDecision[];
}

/**
 * The drafts are plain text; sendGhlEmail takes HTML.
 *
 * ESCAPED, NOT JUST WRAPPED. The client's first name is interpolated into the
 * body and comes from a Shopify field a person typed. An apostrophe would break
 * nothing, but a stray angle bracket in a name would land as markup in the
 * email — and the habit of escaping every interpolated value is worth more than
 * the specific case.
 */
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped.split("\n").join("<br>");
}

export async function fetchAgentSettings(): Promise<AgentSettings | null> {
  const db = createAdminClient();
  const { data, error } = await (db.from("rebooking_agent_settings") as any)
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error || !data) return null;
  return {
    enabled: Boolean(data.enabled),
    dryRun: data.dry_run !== false,
    dailyCap: Number(data.daily_cap ?? 0),
    channels: data.channels === "sms_and_email" ? "sms_and_email" : "sms",
    window: {
      timezone: data.send_timezone || "America/New_York",
      startHour: Number(data.send_start_hour ?? 9),
      endHour: Number(data.send_end_hour ?? 18),
    },
  };
}

async function writeDecisions(runId: string, decisions: RunDecision[]): Promise<void> {
  if (decisions.length === 0) return;
  const db = createAdminClient();
  const { error } = await (db.from("rebooking_agent_decisions") as any).insert(
    decisions.map((d) => ({
      run_id: runId,
      shopify_customer_id: d.customerId,
      client_name: d.clientName,
      decision: d.decision,
      reason: d.reason,
      channel: d.channel,
      days_overdue: d.daysOverdue,
      annual_value: d.annualValue,
      message_body: d.messageBody,
      error: d.error,
    })),
  );
  // A failed audit write must be loud. It does not undo sends that already
  // happened, but it means the trail is incomplete and someone has to know.
  if (error) console.error("[rebooking-agent] AUDIT WRITE FAILED:", error.message);
}

/** How many messages have already gone out today, in the window's own timezone. */
async function sentToday(window: SendWindow, now: Date): Promise<number> {
  const db = createAdminClient();
  const today = localDateInTimezone(now, window.timezone);
  // A day's worth of slack either side, then filtered precisely in JS — the
  // local calendar day is not a range Postgres can express without knowing the
  // timezone rules, and getting that subtly wrong resets the cap mid-evening.
  const from = new Date(now.getTime() - 48 * 3_600_000).toISOString();
  const { data, error } = await (db.from("rebooking_outreach") as any)
    .select("sent_at")
    .gte("sent_at", from);
  if (error) throw new Error(`Could not count today's sends: ${error.message}`);
  return ((data ?? []) as { sent_at: string }[]).filter(
    (r) => localDateInTimezone(new Date(r.sent_at), window.timezone) === today,
  ).length;
}

function halt(runId: string, reason: SkipReason, dryRun: boolean): RunResult {
  return {
    runId,
    halted: true,
    haltReason: reason,
    considered: 0,
    sent: 0,
    wouldSend: 0,
    skipped: 0,
    failed: 0,
    dryRun,
    decisions: [
      {
        customerId: null,
        clientName: null,
        decision: "run_halted",
        reason,
        channel: null,
        daysOverdue: null,
        annualValue: null,
        messageBody: null,
        error: null,
      },
    ],
  };
}

export async function runRebookingAgent(now: Date = new Date()): Promise<RunResult> {
  const runId = randomUUID();

  const settings = await fetchAgentSettings();
  if (!settings) {
    const r = halt(runId, "no_settings", true);
    await writeDecisions(runId, r.decisions);
    return r;
  }

  // Guard 1: the kill switch, read fresh every run and never cached.
  if (!settings.enabled) {
    const r = halt(runId, "agent_disabled", settings.dryRun);
    await writeDecisions(runId, r.decisions);
    return r;
  }

  // Guard 2: the clock. Before Shopify is touched, so an out-of-hours cron tick
  // is cheap as well as safe.
  if (!isWithinSendWindow(now, settings.window)) {
    const r = halt(runId, "outside_send_window", settings.dryRun);
    await writeDecisions(runId, r.decisions);
    return r;
  }

  const queue = await fetchRebookingQueue(now);
  if (queue.notConfigured) {
    const r = halt(runId, "no_settings", settings.dryRun);
    await writeDecisions(runId, r.decisions);
    return r;
  }

  // Guard 3: the daily cap. Counted from real sends, so a dry run never eats it.
  const already = settings.dryRun ? 0 : await sentToday(settings.window, now);
  let budget = Math.max(0, settings.dailyCap - already);

  const decisions: RunDecision[] = [];
  let sent = 0;
  let wouldSend = 0;
  let skipped = 0;
  let failed = 0;

  // queue.clients is already filtered: set-aside, snoozed, reduced-without-a-
  // cadence, merged duplicates and anyone contacted inside the cooldown are all
  // absent. The per-client checks below are the second line, not the first.
  for (const client of queue.clients) {
    const base = {
      customerId: client.customerId,
      clientName: client.name,
      daysOverdue: client.daysOverdue,
      annualValue: client.annualValue,
    };

    if (budget <= 0) {
      decisions.push({ ...base, decision: "skipped", reason: "daily_cap_reached", channel: null, messageBody: null, error: null });
      skipped++;
      continue;
    }

    const channel: "sms" | "email" | null =
      client.reachableBy === "sms" ? "sms" : client.reachableBy === "email" ? "email" : null;

    if (channel === null) {
      decisions.push({ ...base, decision: "skipped", reason: "no_consented_channel", channel: null, messageBody: null, error: null });
      skipped++;
      continue;
    }

    if (channel === "email" && settings.channels === "sms") {
      decisions.push({ ...base, decision: "skipped", reason: "email_sending_off", channel: "email", messageBody: null, error: null });
      skipped++;
      continue;
    }

    /*
     * EVERY DISCOUNT IN THIS SYSTEM IS EARNED BY AN SMS OPT-IN. No exceptions,
     * including win-backs.
     *
     * Two conditions, and both are load-bearing:
     *
     *   60+ days late  - below that this shop's own history says 66-82% come
     *                    back unprompted, so a code buys a decision already
     *                    made. Past 60 days under half return, which is where
     *                    20% has room to change the outcome.
     *   SMS subscribed - the discount is the reward for the channel, and a
     *                    lapsed client who wants it has an obvious route: the
     *                    consent campaign is emailing them the same offer. One
     *                    rule with no special cases is also one rule nobody has
     *                    to remember.
     *
     * The consequence is deliberate and worth knowing: an email-only client 296
     * days late gets a warm message and no code. They are not being ignored —
     * they are being asked for the channel first.
     *
     * hasOpenOffer stops a second code stacking on someone still holding a live
     * one. In a dry run nothing is minted; a preview that creates real
     * discounts is not a preview.
     */
    let offer: AttachedOffer | null = null;
    if (!settings.dryRun && client.smsSubscribed && client.daysOverdue >= WIN_BACK_MIN_DAYS_LATE) {
      if (!(await hasOpenOffer(client.customerId, now))) {
        const made = await createHaircutOffer({
          shopifyCustomerId: client.customerId,
          clientName: client.name,
          context: "win_back",
          now,
        });
        if (made.ok) {
          offer = {
            code: made.offer.code,
            percentOff: made.offer.percentOff,
            expiresAt: made.offer.expiresAt,
          };
        } else {
          // A failed discount must not cost the message. Send without it.
          console.warn(`[rebooking-agent] offer failed for ${client.name}: ${made.error}`);
        }
      }
    }

    /*
     * A LAPSED CLIENT WHO CANNOT BE TEXTED IS TOLD WHAT THEY ARE MISSING.
     *
     * Without this, Jarrell Tinsley — 296 days gone and worth $1,134 a year —
     * gets a warm note that mentions no discount, while a separate email asks
     * him to opt in for one. Two disconnected asks landing on the same person,
     * spending the single most attentive moment we get with him on only half
     * the pitch.
     *
     * findOrCreateInvite reuses an existing token rather than minting a second,
     * so the agent and the consent campaign always point at the same page and
     * nobody ends up with two live links. It returns null once someone has
     * confirmed or declined — there is nothing left to invite them to.
     */
    let nudge: OptInNudge | null = null;
    // The `late` check MUST match the one in draftMessages. Without it an invite
    // row is created for a client whose message will not show the link — and
    // because the consent campaign skips anyone who already has a record, that
    // client is then never asked at all. An invite nobody sees is worse than no
    // invite: it silently removes them from the campaign that would have.
    const messageWillShowNudge = client.status === "overdue" || client.status === "at_risk";
    if (
      !settings.dryRun &&
      !offer &&
      !client.smsSubscribed &&
      client.email &&
      messageWillShowNudge &&
      client.note?.status !== "reduced"
    ) {
      const invite = await findOrCreateInvite({
        shopifyCustomerId: client.customerId,
        clientName: client.name,
        email: client.email,
      });
      if (invite) {
        nudge = { consentUrl: `${SITE_URL}/sms-consent/${invite.token}`, percentOff: OFFER_PERCENT };
      }
    }

    const drafts = draftMessages(client, BOOKING_URL, offer, nudge);
    const body = channel === "sms" ? drafts.sms : `${drafts.emailSubject}\n\n${drafts.emailBody}`;

    if (settings.dryRun) {
      decisions.push({ ...base, decision: "would_send", reason: null, channel, messageBody: body, error: null });
      wouldSend++;
      budget--;
      continue;
    }

    try {
      const result =
        channel === "sms"
          ? await sendGhlSms({ message: drafts.sms, phone: client.phone, name: client.name })
          : await sendGhlEmail({
              email: client.email ?? "",
              subject: drafts.emailSubject,
              html: textToHtml(drafts.emailBody),
              name: client.name,
            });

      if (!result.ok) {
        decisions.push({
          ...base,
          decision: "failed",
          reason: "send_failed",
          channel,
          messageBody: body,
          error: result.error ?? "unknown send error",
        });
        failed++;
        continue;
      }

      // Only after a confirmed send: the cooldown stamp and the attribution
      // row. Writing these before the send would rest a client who never got a
      // message and credit the agent with outreach that failed.
      await markContacted(client.customerId, client.name);
      await logOutreach({
        shopifyCustomerId: client.customerId,
        clientName: client.name,
        channel,
        cadenceDays: client.cadenceDays,
        daysOverdue: client.daysOverdue,
        latenessBucket: bucketFor(client.daysOverdue),
        annualValue: client.annualValue,
        averageTicket: client.averageTicket,
        costCents: channel === "sms" ? 1 : 0,
      });

      decisions.push({ ...base, decision: "sent", reason: null, channel, messageBody: body, error: null });
      sent++;
      budget--;
    } catch (e) {
      decisions.push({
        ...base,
        decision: "failed",
        reason: "send_failed",
        channel,
        messageBody: body,
        error: e instanceof Error ? e.message : String(e),
      });
      failed++;
    }
  }

  await writeDecisions(runId, decisions);

  return {
    runId,
    halted: false,
    haltReason: null,
    considered: queue.clients.length,
    sent,
    wouldSend,
    skipped,
    failed,
    dryRun: settings.dryRun,
    decisions,
  };
}

export { CONTACT_COOLDOWN_DAYS, describeWindow };
export type { DueClient };
