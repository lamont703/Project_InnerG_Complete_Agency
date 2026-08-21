/**
 * When the agent is allowed to send.
 *
 * WHY THIS IS NOT `getHours() - 5`. Eastern time is UTC-5 for part of the year
 * and UTC-4 for the rest, and the offset changes on dates that move. A
 * hardcoded offset is correct for about eight months and then silently sends an
 * hour early or late for the other four — including, twice a year, a window
 * that opens at 8am to someone's phone on a Sunday morning. Intl knows the
 * rules; nothing here should try to.
 *
 * The window is inclusive of the start hour and exclusive of the end hour:
 * 9 <= hour < 18 means the last message can go out at 17:59 Eastern and none at
 * 18:00. That is the reading of "between 9am and 6pm" that never sends at 6pm
 * on the nose.
 */

export const DEFAULT_TIMEZONE = "America/New_York";
export const DEFAULT_START_HOUR = 9;
export const DEFAULT_END_HOUR = 18;

export interface SendWindow {
  timezone: string;
  startHour: number;
  endHour: number;
}

export const DEFAULT_WINDOW: SendWindow = {
  timezone: DEFAULT_TIMEZONE,
  startHour: DEFAULT_START_HOUR,
  endHour: DEFAULT_END_HOUR,
};

/**
 * The local hour (0–23) in a timezone, DST included.
 *
 * `hour12: false` yields "24" for midnight in some ICU versions rather than
 * "00", which would put midnight outside every sane window by looking like the
 * end of the day. Normalised here so callers never see it.
 */
export function hourInTimezone(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const raw = parts.find((p) => p.type === "hour")?.value ?? "0";
  const h = Number(raw);
  return Number.isFinite(h) ? h % 24 : 0;
}

/** Local calendar date in a timezone, as YYYY-MM-DD. Used for the daily cap. */
export function localDateInTimezone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isWithinSendWindow(now: Date, window: SendWindow = DEFAULT_WINDOW): boolean {
  const h = hourInTimezone(now, window.timezone);
  return h >= window.startHour && h < window.endHour;
}

/** Human-readable reason, for the audit log and the UI. */
export function describeWindow(window: SendWindow = DEFAULT_WINDOW): string {
  const fmt = (h: number) => {
    const am = h < 12;
    const twelve = h % 12 === 0 ? 12 : h % 12;
    return `${twelve}${am ? "am" : "pm"}`;
  };
  return `${fmt(window.startHour)}–${fmt(window.endHour)} ${window.timezone.split("/")[1].replace("_", " ")}`;
}
