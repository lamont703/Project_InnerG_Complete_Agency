/**
 * The content publisher's schedule — pure, so the cron, the page and the tests all run the
 * same rules. (No "server-only": a test imports it, and nothing here touches the database.)
 *
 * THE MODEL, set on /admin/content-publisher (decided 2026-10-02):
 *   - paused:      nothing publishes. Checked first, before any slot is claimed.
 *   - weeklySlots: days and hours, Eastern wall-clock, e.g. Tue 14:00 and Fri 14:00.
 *                  At each one the front of the line goes out (position order).
 *   - pinned:      a video with its own scheduledFor goes out at the first run at or after
 *                  that instant, ahead of the weekly order. One post per hour at most.
 *
 * WALL-CLOCK EASTERN, NOT UTC. Vercel cron is UTC-only, so the job runs hourly and asks
 * what time it is in New York — the reason the old fixed slots were written the same way.
 * Slots are whole hours because the job fires at :00.
 */

export const PUBLISH_TZ = "America/New_York";
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface WeeklySlot { day: number; hour: number }
export interface PublisherSettings { paused: boolean; weeklySlots: WeeklySlot[] }

/** Anything from the database or a form, as a clean, sorted, de-duplicated slot list. */
export function parseWeeklySlots(input: unknown): WeeklySlot[] {
  const arr = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const out: WeeklySlot[] = [];
  for (const s of arr) {
    const day = Number((s as any)?.day), hour = Number((s as any)?.hour);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) continue;
    const k = `${day}:${hour}`;
    if (seen.has(k)) continue;
    seen.add(k); out.push({ day, hour });
  }
  return out.sort((a, b) => a.day - b.day || a.hour - b.hour);
}

/** Calendar date, hour and weekday of an instant, in Eastern. */
export function easternParts(d: Date): { date: string; hour: number; day: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: PUBLISH_TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", hourCycle: "h23", weekday: "short",
    }).formatToParts(d).map((x) => [x.type, x.value])
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour) % 24,
    day: DAY_SHORT.indexOf(p.weekday as (typeof DAY_SHORT)[number]),
  };
}

/** The UTC instant of an Eastern wall-clock date + hour. DST-safe (two-pass offset). */
export function easternToInstant(date: string, hour: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour);
  const offset = (t: number) => {
    const e = easternParts(new Date(t));
    const [ey, em, ed] = e.date.split("-").map(Number);
    return Date.UTC(ey, em - 1, ed, e.hour) - t;
  };
  let t = guess - offset(guess);
  t = guess - offset(t);
  return new Date(t);
}

export function isWeeklySlot(slots: WeeklySlot[], now: Date): boolean {
  const e = easternParts(now);
  return slots.some((s) => s.day === e.day && s.hour === e.hour);
}

/** The next `count` weekly slot instants strictly after `from`. */
export function nextWeeklySlots(slots: WeeklySlot[], from: Date, count: number): Date[] {
  if (!slots.length || count <= 0) return [];
  const out: Date[] = [];
  const start = easternParts(from).date;
  const [y, m, d] = start.split("-").map(Number);
  for (let i = 0; out.length < count && i < 7 * (count + 2); i++) {
    const cal = new Date(Date.UTC(y, m - 1, d + i));
    const date = cal.toISOString().slice(0, 10);
    const weekday = cal.getUTCDay();
    for (const s of slots) {
      if (s.day !== weekday) continue;
      const at = easternToInstant(date, s.hour);
      if (at.getTime() > from.getTime()) out.push(at);
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime()).slice(0, count);
}

export interface QueueEntry {
  id: string;
  position: number;
  scheduledFor: string | null;
  hasVideo: boolean;
}

export type Decision =
  | { kind: "paused" }
  | { kind: "not_a_slot" }
  | { kind: "empty"; reason: "weekly" }
  | { kind: "publish"; id: string; reason: "pinned" | "weekly" };

/**
 * What the hourly job should do right now. Pinned-and-due beats the weekly slot; a row
 * with no video is never chosen (it would burn the slot, as before).
 */
export function decide(settings: PublisherSettings, queue: QueueEntry[], now: Date): Decision {
  if (settings.paused) return { kind: "paused" };
  const ready = queue.filter((q) => q.hasVideo);
  const due = ready
    .filter((q) => q.scheduledFor && new Date(q.scheduledFor).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime() || a.position - b.position);
  if (due.length) return { kind: "publish", id: due[0].id, reason: "pinned" };
  if (!isWeeklySlot(settings.weeklySlots, now)) return { kind: "not_a_slot" };
  const next = ready.filter((q) => !q.scheduledFor).sort((a, b) => a.position - b.position)[0];
  return next ? { kind: "publish", id: next.id, reason: "weekly" } : { kind: "empty", reason: "weekly" };
}

export interface PlannedPost {
  id: string;
  /** When it will go out, if the schedule as set reaches it; null if it never will. */
  at: string | null;
  pinned: boolean;
  /** Pinned to a time already past — it goes at the next hourly run once unpaused. */
  overdue: boolean;
}

/**
 * When each queued video will go out, the same way decide() will choose — so the page's
 * preview cannot disagree with what actually publishes. Pinned rows keep their own time and
 * take that hour; everything else fills the weekly slots in position order, skipping any
 * hour a pinned post already has.
 */
export function planQueue(settings: PublisherSettings, queue: QueueEntry[], now: Date): PlannedPost[] {
  const hourKey = (t: Date) => { const e = easternParts(t); return `${e.date} ${e.hour}`; };
  const taken = new Set<string>();
  const out = new Map<string, PlannedPost>();
  for (const q of queue) {
    if (!q.scheduledFor) continue;
    const at = new Date(q.scheduledFor);
    const overdue = at.getTime() <= now.getTime();
    out.set(q.id, { id: q.id, at: at.toISOString(), pinned: true, overdue });
    if (!overdue && q.hasVideo) taken.add(hourKey(at));
  }
  const waiting = queue.filter((q) => !q.scheduledFor).sort((a, b) => a.position - b.position);
  const publishable = waiting.filter((q) => q.hasVideo);
  const slots = nextWeeklySlots(settings.weeklySlots, now, publishable.length + taken.size + 2)
    .filter((t) => !taken.has(hourKey(t)));
  publishable.forEach((q, i) => out.set(q.id, { id: q.id, at: slots[i]?.toISOString() ?? null, pinned: false, overdue: false }));
  for (const q of waiting) if (!q.hasVideo) out.set(q.id, { id: q.id, at: null, pinned: false, overdue: false });
  return queue.map((q) => out.get(q.id)!);
}

/** "Tue, Oct 6 · 2:00 PM ET" */
export function formatEastern(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { timeZone: PUBLISH_TZ, weekday: "short", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: PUBLISH_TZ, hour: "numeric", minute: "2-digit" }).format(d);
  return `${day} · ${time} ET`;
}

export function hourLabel(h: number): string {
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ampm}`;
}

/** "Tuesdays and Fridays at 2:00 PM ET" style summary of the weekly slots. */
export function describeSlots(slots: WeeklySlot[]): string {
  if (!slots.length) return "no weekly posting times set";
  return slots.map((s) => `${DAY_SHORT[s.day]} ${hourLabel(s.hour)}`).join(", ") + " ET";
}
