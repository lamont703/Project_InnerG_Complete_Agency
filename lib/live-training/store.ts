import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { sendGhlEmail } from "@/lib/ghl-email";
import { sendGhlSms } from "@/lib/ghl-sms";
import { normalisePhone } from "@/lib/calendar/store";
import {
  STEPS, SMS_PER_EVENT, sessionForRegistration, upcomingSession, stepDue, campaignWeekDue, campaignSession,
  isCampaignStartDay, type Step, type StepId,
} from "@/lib/live-training/schedule";
import { hypeEmail, hypeSms, campaignEmail } from "@/lib/live-training/messages";

/**
 * The LIVE training's data and sending: registration, the hype sequence, the
 * 12-week member campaign, and unsubscribes. Timing and copy are pure and
 * tested (schedule.ts, messages.ts); this file does the database and the
 * sending, on the same GoHighLevel rails as every other email and text.
 *
 * Every send is CLAIMED in the database before it goes out (a unique row per
 * registration, step and channel; per week and email for the campaign), so
 * overlapping cron runs or a retry can never send twice.
 */

const db = () => createAdminClient() as any;

/** The words a registrant agrees to when they tick the texts box. Stored with the registration. */
export const SMS_CONSENT_TEXT =
  `Text me reminders and the join link for this LIVE training from ShearQuery (up to ${SMS_PER_EVENT} messages per event). Msg & data rates may apply. Reply STOP to opt out, HELP for help. Consent is not required to register.`;

// ── settings ────────────────────────────────────────────────────────────────

export interface LiveTrainingConfig { default_meet_url: string | null; campaign_start: string | null; mailing_address: string | null }

export async function getConfig(): Promise<LiveTrainingConfig> {
  const { data } = await db().from("live_training_config").select("default_meet_url, campaign_start, mailing_address").eq("id", 1).maybeSingle();
  return data ?? { default_meet_url: null, campaign_start: null, mailing_address: null };
}

export async function saveConfig(input: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  const patch: Record<string, unknown> = {};
  if (input.default_meet_url !== undefined) {
    const url = String(input.default_meet_url || "").trim();
    if (url && !/^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(url)) return { ok: false, error: "That doesn't look like a Google Meet link (https://meet.google.com/…)." };
    patch.default_meet_url = url || null;
  }
  if (input.campaign_start !== undefined) {
    const d = String(input.campaign_start || "").trim();
    if (d && !isCampaignStartDay(d)) return { ok: false, error: "The campaign starts on a Wednesday (emails go out Wednesdays at 11 AM ET)." };
    patch.campaign_start = d || null;
  }
  if (input.mailing_address !== undefined) {
    const a = String(input.mailing_address || "").trim();
    if (a && a.length < 10) return { ok: false, error: "Give the full mailing address — street or PO box, city, state and ZIP." };
    patch.mailing_address = a || null;
  }
  const { error } = await db().from("live_training_config").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function meetUrlFor(sessionDate: string, cfg?: LiveTrainingConfig): Promise<string | null> {
  const { data } = await db().from("live_training_sessions").select("meet_url").eq("session_date", sessionDate).maybeSingle();
  return data?.meet_url || (cfg ?? (await getConfig())).default_meet_url || null;
}

export async function setSessionMeetUrl(sessionDate: string, url: string | null) {
  if (url && !/^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(url)) throw new Error("That doesn't look like a Google Meet link.");
  await db().from("live_training_sessions").upsert({ session_date: sessionDate, meet_url: url || null }, { onConflict: "session_date" });
}

// ── unsubscribe ─────────────────────────────────────────────────────────────

function secret(): string {
  const s = process.env.CHAT_ACTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("No secret for unsubscribe links.");
  return createHmac("sha256", s).update("shearquery-unsubscribe").digest("hex");
}
const sig = (email: string) => createHmac("sha256", secret()).update(email.toLowerCase()).digest("base64url").slice(0, 32);

export function unsubscribeUrl(email: string): string {
  return `${SITE_URL}/unsubscribe?e=${encodeURIComponent(Buffer.from(email.toLowerCase()).toString("base64url"))}&t=${sig(email)}`;
}

export async function unsubscribe(e: string, t: string): Promise<{ ok: true; email: string } | { ok: false }> {
  let email = "";
  try { email = Buffer.from(String(e), "base64url").toString("utf8").toLowerCase(); } catch { return { ok: false }; }
  const a = Buffer.from(sig(email)), b = Buffer.from(String(t));
  if (!email.includes("@") || a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  await db().from("email_suppressions").upsert({ email, reason: "unsubscribed" }, { onConflict: "email", ignoreDuplicates: true });
  return { ok: true, email };
}

async function suppressedSet(emails: string[]): Promise<Set<string>> {
  if (!emails.length) return new Set();
  const { data } = await db().from("email_suppressions").select("email").in("email", emails);
  return new Set((data || []).map((r: any) => r.email));
}

// ── registration ────────────────────────────────────────────────────────────

export type RegisterResult = { ok: true; sessionDate: string; already: boolean } | { ok: false; error: string };

export async function register(input: {
  firstName: unknown; email: unknown; phone?: unknown; smsConsent?: unknown; audience?: unknown; source?: unknown;
  ip?: string | null; userAgent?: string | null;
}, now = new Date()): Promise<RegisterResult> {
  const firstName = String(input.firstName ?? "").trim().slice(0, 60);
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!firstName) return { ok: false, error: "Add your first name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return { ok: false, error: "That email doesn't look right." };
  const smsConsent = input.smsConsent === true;
  const phone = input.phone ? normalisePhone(input.phone) : null;
  if (input.phone && !phone) return { ok: false, error: "That doesn't look like a full mobile number with area code." };
  if (smsConsent && !phone) return { ok: false, error: "Add your mobile number to get text reminders." };

  const sessionDate = sessionForRegistration(now);
  const { data: member } = await db().from("community_members").select("id").ilike("email", email).maybeSingle();
  const row = {
    session_date: sessionDate, first_name: firstName, email, phone,
    sms_consent: smsConsent && !!phone,
    sms_consent_text: smsConsent && phone ? SMS_CONSENT_TEXT : null,
    consent_ip: input.ip ?? null, consent_user_agent: (input.userAgent ?? "").slice(0, 300) || null,
    audience: input.audience ? String(input.audience).slice(0, 40) : null,
    source: input.source ? String(input.source).slice(0, 80) : null,
    community_member_id: member?.id ?? null,
  };
  const { data: existing } = await db().from("live_training_registrations").select("id, phone, sms_consent, sms_consent_text, consent_ip, consent_user_agent, audience, source").eq("session_date", sessionDate).eq("email", email).maybeSingle();
  let id: string;
  if (existing) {
    // Signing up again without a phone or the box ticked doesn't take back the
    // texts they already asked for — STOP does that. New details win.
    const merged = row.sms_consent
      ? row
      : {
          ...row,
          phone: row.phone ?? existing.phone,
          sms_consent: existing.sms_consent && (row.phone ?? existing.phone) === existing.phone,
          sms_consent_text: existing.sms_consent_text,
          consent_ip: existing.consent_ip,
          consent_user_agent: existing.consent_user_agent,
          audience: row.audience ?? existing.audience,
          source: row.source ?? existing.source,
        };
    await db().from("live_training_registrations").update({ ...merged, cancelled_at: null }).eq("id", existing.id);
    id = existing.id;
  } else {
    const { data, error } = await db().from("live_training_registrations").insert(row).select("id").single();
    if (error) return { ok: false, error: "Couldn't save your registration. Try again." };
    id = data.id;
  }
  // Signing up again is a fresh yes to email: lift an old unsubscribe.
  await db().from("email_suppressions").delete().eq("email", email);
  await sendStep(id, STEPS.find((s) => s.id === "confirm")!);
  return { ok: true, sessionDate, already: !!existing };
}

// ── sending the hype sequence ───────────────────────────────────────────────

async function claim(registrationId: string, step: StepId, channel: "email" | "sms"): Promise<boolean> {
  const { error } = await db().from("live_training_sends").insert({ registration_id: registrationId, step, channel });
  return !error; // a duplicate key means it's already sent (or being sent)
}
async function noteError(registrationId: string, step: StepId, channel: "email" | "sms", error: string) {
  await db().from("live_training_sends").update({ error: error.slice(0, 300) }).eq("registration_id", registrationId).eq("step", step).eq("channel", channel);
}

/** Send one step to one registration, on each channel it uses. Skips a link step while no Meet link is set. */
async function sendStep(registrationId: string, step: Step, cfg?: LiveTrainingConfig): Promise<"sent" | "no_link" | "skipped"> {
  const { data: r } = await db().from("live_training_registrations").select("*").eq("id", registrationId).single();
  if (!r || r.cancelled_at) return "skipped";
  const config = cfg ?? (await getConfig());
  const meetUrl = step.withLink ? await meetUrlFor(r.session_date, config) : null;
  if (step.withLink && !meetUrl) return "no_link";

  let sent = false;
  if (step.email && !(await suppressedSet([r.email])).has(r.email) && (await claim(r.id, step.id, "email"))) {
    sent = true;
    const m = hypeEmail(step.id, { firstName: r.first_name, sessionDate: r.session_date, meetUrl, unsubscribeUrl: unsubscribeUrl(r.email), mailingAddress: config.mailing_address });
    const res = await sendGhlEmail({ email: r.email, name: r.first_name, subject: m.subject, html: m.html });
    if (!res.ok) await noteError(r.id, step.id, "email", res.error || "send failed");
  }
  if (step.sms && r.sms_consent && r.phone && (await claim(r.id, step.id, "sms"))) {
    sent = true;
    const text = hypeSms(step.id, { firstName: r.first_name, sessionDate: r.session_date, meetUrl });
    if (text) {
      const res = await sendGhlSms({ phone: r.phone, message: text });
      if (!res.ok) await noteError(r.id, step.id, "sms", (res as any).error || "send failed");
    }
  }
  return sent ? "sent" : "skipped";
}

/** The cron's job: every step that's due for the upcoming session, to everyone registered. */
export async function runDueReminders(now = new Date()) {
  const session = upcomingSession(now);
  const cfg = await getConfig();
  const { data: regs } = await db().from("live_training_registrations").select("id").eq("session_date", session).is("cancelled_at", null);
  const summary: Record<string, number> = {};
  let missingLink = false;
  for (const step of STEPS) {
    if (step.id !== "confirm" && !stepDue(step, session, now)) continue;
    for (const r of regs || []) {
      const out = await sendStep(r.id, step, cfg);
      if (out === "no_link") missingLink = true;
      if (out === "sent") summary[step.id] = (summary[step.id] || 0) + 1;
    }
  }
  return { session, registrations: (regs || []).length, stepsRun: summary, missingLink };
}

// ── the 12-week member campaign ─────────────────────────────────────────────

export async function runCampaign(now = new Date()) {
  const cfg = await getConfig();
  const week = campaignWeekDue(cfg.campaign_start, now);
  if (!week) return { week: null };
  // CAN-SPAM: a promotional email must show a physical address. No address, no campaign.
  if (!cfg.mailing_address) return { week, blocked: "Set the mailing address on /admin/live-training before the campaign can send." };
  const session = campaignSession(cfg.campaign_start!, week);

  const { data: members } = await db().from("community_members").select("email, first_name").not("email", "is", null).eq("is_demo", false);
  const all: { email: string; firstName: string | null }[] = (members || []).map((m: any) => ({ email: String(m.email).toLowerCase(), firstName: m.first_name as string | null })).filter((m: any) => m.email.includes("@"));
  const suppressed = await suppressedSet(all.map((m) => m.email));
  const { data: regs } = await db().from("live_training_registrations").select("email").eq("session_date", session).is("cancelled_at", null);
  const registered = new Set((regs || []).map((r: any) => r.email));

  let sent = 0, skipped = 0;
  for (const m of all) {
    if (suppressed.has(m.email) || registered.has(m.email)) { skipped++; continue; }
    const { error: claimErr } = await db().from("live_training_campaign_sends").insert({ week, email: m.email });
    if (claimErr) continue; // already sent this week
    const e = campaignEmail(week, { firstName: m.firstName, sessionDate: session, unsubscribeUrl: unsubscribeUrl(m.email), mailingAddress: cfg.mailing_address });
    const res = await sendGhlEmail({ email: m.email, name: m.firstName || m.email, subject: e.subject, html: e.html });
    if (!res.ok) await db().from("live_training_campaign_sends").update({ error: (res.error || "send failed").slice(0, 300) }).eq("week", week).eq("email", m.email);
    else sent++;
  }
  return { week, session, sent, skipped };
}

// ── the admin page ──────────────────────────────────────────────────────────

export async function adminOverview(now = new Date()) {
  const cfg = await getConfig();
  const next = sessionForRegistration(now);
  const upcoming = upcomingSession(now);
  const sessions = [...new Set([upcoming, next])];
  const out = [];
  for (const s of sessions) {
    const { data: regs } = await db().from("live_training_registrations").select("first_name, email, phone, sms_consent, audience, source, created_at").eq("session_date", s).is("cancelled_at", null).order("created_at");
    out.push({ sessionDate: s, meetUrl: await meetUrlFor(s, cfg), registrations: regs || [] });
  }
  const { data: sends } = await db().from("live_training_campaign_sends").select("week, sent_at, error");
  const byWeek: Record<number, { sent: number; failed: number }> = {};
  for (const r of sends || []) {
    byWeek[r.week] ??= { sent: 0, failed: 0 };
    if (r.error) byWeek[r.week].failed++; else byWeek[r.week].sent++;
  }
  return { config: cfg, sessions: out, campaign: byWeek };
}
