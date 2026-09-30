import { addDaysToKey, localDateKey, parseDateKey, weekdayOfKey, zonedToUtc } from "@/lib/calendar/time";

/**
 * WHEN THE LIVE TRAINING HAPPENS, AND WHEN EACH REMINDER GOES OUT. Pure, so
 * the rules are tested without a database or a clock (policy.test pattern).
 *
 * Decided with the product owner on 2026-09-29:
 *  - Every Monday, 3:00 PM Eastern (Google Meet).
 *  - Registration closes 48 hours before. Signing up after that registers you
 *    for the FOLLOWING Monday, so nobody is turned away.
 *  - The Meet link is first sent 24 hours before, then with every reminder.
 *
 * Eastern time via the zone, never a fixed offset — the event is 3 PM on the
 * wall clock in both EST and EDT (lib/calendar/time.ts is DST-tested).
 */

export const EVENT_TZ = "America/New_York";
export const EVENT_WEEKDAY = 1; // Monday
export const EVENT_MINUTE = 15 * 60; // 3:00 PM
export const EVENT_LENGTH_MIN = 60;
export const REGISTRATION_CLOSES_HOURS = 48;

export const EVENT_NAME = "AI Barber Beauty Business Training";
export const EVENT_HOST = "ShearQuery Cosmetology & Barber Board";

/** When a session (its Monday's date, Eastern) starts. */
export function sessionStart(sessionDate: string): Date {
  const p = parseDateKey(sessionDate);
  if (!p) throw new Error(`Not a date: ${sessionDate}`);
  return zonedToUtc(p.year, p.month, p.day, EVENT_MINUTE, EVENT_TZ);
}

export function registrationClosesAt(sessionDate: string): Date {
  return new Date(sessionStart(sessionDate).getTime() - REGISTRATION_CLOSES_HOURS * 3600_000);
}

/** The Monday on or after this date. */
function mondayOnOrAfter(key: string): string {
  const wd = weekdayOfKey(key);
  return addDaysToKey(key, (EVENT_WEEKDAY - wd + 7) % 7);
}

/** The session someone signing up now is registered for: the next Monday whose registration is still open. */
export function sessionForRegistration(now: Date): string {
  let session = mondayOnOrAfter(localDateKey(now, EVENT_TZ));
  // Today's Monday after it started, or any Monday inside the 48-hour close: the following week.
  while (now.getTime() >= registrationClosesAt(session).getTime()) session = addDaysToKey(session, 7);
  return session;
}

/**
 * How the public page names the session, with no date, so it stays evergreen
 * (the owner's ask, 2026-09-29): "This Monday" while registration for the
 * coming Monday is open, "Monday next week" once it has closed.
 */
export function sessionLabel(now: Date): "This Monday" | "Monday next week" {
  return sessionForRegistration(now) === mondayOnOrAfter(localDateKey(now, EVENT_TZ)) ? "This Monday" : "Monday next week";
}

/** The session happening next (or now) — what reminders and the admin page are about. */
export function upcomingSession(now: Date): string {
  let session = mondayOnOrAfter(localDateKey(now, EVENT_TZ));
  if (now.getTime() > sessionStart(session).getTime() + EVENT_LENGTH_MIN * 60_000) session = addDaysToKey(session, 7);
  return session;
}

// ── the hype sequence ───────────────────────────────────────────────────────

export type StepId = "confirm" | "closed" | "link" | "morning" | "hour" | "ten" | "live";

export interface Step {
  id: StepId;
  /** When it's due, for a session. `confirm` is sent at registration instead. */
  dueAt: (sessionDate: string) => Date;
  /** After this long past due, it's skipped rather than sent late (a "starting now" text an hour late is worse than none). */
  graceMinutes: number;
  email: boolean;
  sms: boolean;
  /** Carries the Meet link — never before the 24-hour mark. */
  withLink: boolean;
}

const before = (min: number) => (d: string) => new Date(sessionStart(d).getTime() - min * 60_000);

export const STEPS: Step[] = [
  { id: "confirm", dueAt: () => new Date(0), graceMinutes: Number.MAX_SAFE_INTEGER, email: true, sms: true, withLink: false },
  { id: "closed", dueAt: before(REGISTRATION_CLOSES_HOURS * 60), graceMinutes: 12 * 60, email: true, sms: false, withLink: false },
  { id: "link", dueAt: before(24 * 60), graceMinutes: 12 * 60, email: true, sms: true, withLink: true },
  {
    id: "morning",
    // 10:00 AM Eastern on the day.
    dueAt: (d) => { const p = parseDateKey(d)!; return zonedToUtc(p.year, p.month, p.day, 10 * 60, EVENT_TZ); },
    graceMinutes: 3 * 60, email: true, sms: true, withLink: true,
  },
  { id: "hour", dueAt: before(60), graceMinutes: 40, email: true, sms: true, withLink: true },
  { id: "ten", dueAt: before(10), graceMinutes: 9, email: true, sms: true, withLink: true },
  { id: "live", dueAt: before(0), graceMinutes: 20, email: true, sms: true, withLink: true },
];

/** Whether a step is due now: past its time and not so late it's stale. */
export function stepDue(step: Step, sessionDate: string, now: Date): boolean {
  if (step.id === "confirm") return true;
  const due = step.dueAt(sessionDate).getTime();
  return now.getTime() >= due && now.getTime() <= due + step.graceMinutes * 60_000;
}

/** Texts one registration can receive per event — said in the consent line, so it must match. */
export const SMS_PER_EVENT = STEPS.filter((s) => s.sms).length;

// ── the 12-week member campaign ─────────────────────────────────────────────

export const CAMPAIGN_WEEKS = 12;
/** Wednesdays, 11:00 AM Eastern — before Saturday's registration close. */
export const CAMPAIGN_WEEKDAY = 3;
export const CAMPAIGN_MINUTE = 11 * 60;

/** The campaign starts on a Wednesday; the admin page refuses any other day. */
export const isCampaignStartDay = (key: string) => !!parseDateKey(key) && weekdayOfKey(key) === CAMPAIGN_WEEKDAY;

/** The Monday session a campaign week promotes: that Wednesday + 5 days. */
export const campaignSession = (campaignStart: string, week: number) => addDaysToKey(campaignStart, (week - 1) * 7 + 5);

/**
 * Which campaign week (1–12) is due now, or null. Due from Wednesday 11 AM
 * Eastern until registration closes that Saturday, so a missed cron run
 * catches up, but a week never goes out once it can't help.
 */
export function campaignWeekDue(campaignStart: string | null, now: Date): number | null {
  if (!campaignStart || !isCampaignStartDay(campaignStart)) return null;
  for (let week = 1; week <= CAMPAIGN_WEEKS; week++) {
    const wednesday = addDaysToKey(campaignStart, (week - 1) * 7);
    const p = parseDateKey(wednesday)!;
    const opens = zonedToUtc(p.year, p.month, p.day, CAMPAIGN_MINUTE, EVENT_TZ).getTime();
    const closes = registrationClosesAt(campaignSession(campaignStart, week)).getTime();
    if (now.getTime() >= opens && now.getTime() < closes) return week;
  }
  return null;
}
