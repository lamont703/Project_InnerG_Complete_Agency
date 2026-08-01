/**
 * Event posts.
 *
 * Google's LocalPost supports a topicType of EVENT, which renders with a date
 * and a title rather than as a plain update. It is the one post type where we
 * hold data nobody else does: the directory already tracks barber and beauty
 * industry events — expos, bootcamps, conventions — with dates and venues.
 *
 * THE JUDGEMENT THAT SHAPES THIS MODULE. Those events belong to organisers,
 * not to the shops in our directory. Offering every Dallas barber a ready-made
 * "BARBERCON DALLAS" post would put near-identical copy on dozens of listings
 * and tell customers a shop is running a convention it has nothing to do with.
 * So an event post here is about the SHOP'S ATTENDANCE — "we'll be at
 * Barbercon on the 13th, the shop is closed" — which is true, is different for
 * every shop, and is the thing a customer actually needs to know.
 *
 * Two consequences run through the code:
 *
 *  1. Nothing is suggested. Directory events are offered as candidates the
 *     owner picks from, because only they know whether they're going. We are
 *     not in a position to assert attendance on someone's public listing.
 *  2. An owner can describe their own event instead, which is the purest case
 *     for this post type and the one with no data behind it.
 *
 * Pure — no network.
 */

export interface DirectoryEvent {
  id: string;
  title: string;
  description?: string | null;
  /** ISO calendar date, YYYY-MM-DD. */
  event_date: string;
  end_date?: string | null;
  /** HH:MM:SS, when known. */
  start_time?: string | null;
  end_time?: string | null;
  venue_name?: string | null;
  city?: string | null;
  ticket_url?: string | null;
}

/** Google's Date, as LocalPostEvent.schedule expects it. */
export interface GDate {
  year: number;
  month: number;
  day: number;
}
export interface GTimeOfDay {
  hours: number;
  minutes: number;
}
export interface LocalPostEvent {
  title: string;
  schedule: {
    startDate: GDate;
    startTime: GTimeOfDay;
    endDate: GDate;
    endTime: GTimeOfDay;
  };
}

/** Google caps the event title well below the post body. */
export const EVENT_TITLE_MAX = 58;

export function parseDate(iso: string): GDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || "").trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = { year: Number(y), month: Number(mo), day: Number(d) };
  if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > 31) return null;
  return date;
}

/**
 * Parse HH:MM:SS, or fall back.
 *
 * Most rows in the directory have no times — the CT expo has neither, Barbercon
 * has a start and no end. Google wants all four components, so a missing time
 * becomes the whole day rather than an invented "10am–4pm": we don't know the
 * schedule, and printing a specific hour on someone's listing that turns out to
 * be wrong is worse than printing the date alone.
 */
export function parseTime(hhmmss: string | null | undefined, fallback: GTimeOfDay): GTimeOfDay {
  const m = /^(\d{1,2}):(\d{2})/.exec((hhmmss || "").trim());
  if (!m) return fallback;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return fallback;
  return { hours, minutes };
}

export const DAY_START: GTimeOfDay = { hours: 0, minutes: 0 };
export const DAY_END: GTimeOfDay = { hours: 23, minutes: 59 };

/** Truncate to Google's title limit without cutting mid-word. */
export function trimEventTitle(title: string, max = EVENT_TITLE_MAX): string {
  const clean = (title || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:–-]$/, "").trim() + "…";
}

export interface EventIssue {
  level: "error" | "warning";
  message: string;
}

/**
 * Build the Google event object from a directory row.
 *
 * Returns issues rather than throwing, so the caller can show an owner why a
 * particular event can't be posted instead of it silently disappearing.
 */
export function toLocalPostEvent(
  event: Pick<DirectoryEvent, "title" | "event_date" | "end_date" | "start_time" | "end_time">,
  opts: { titleOverride?: string } = {}
): { event?: LocalPostEvent; issues: EventIssue[] } {
  const issues: EventIssue[] = [];

  const title = trimEventTitle(opts.titleOverride || event.title || "");
  if (!title) {
    issues.push({ level: "error", message: "The event needs a title." });
  }

  const startDate = parseDate(event.event_date);
  if (!startDate) {
    issues.push({ level: "error", message: "That event has no usable date." });
    return { issues };
  }

  // A one-day event has no end_date in our data; Google still wants one.
  const endDate = event.end_date ? parseDate(event.end_date) ?? startDate : startDate;

  if (issues.some((i) => i.level === "error")) return { issues };

  return {
    event: {
      title,
      schedule: {
        startDate,
        startTime: parseTime(event.start_time, DAY_START),
        endDate,
        endTime: parseTime(event.end_time, DAY_END),
      },
    },
    issues,
  };
}

const isoOf = (d: GDate) =>
  `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

/**
 * Is this event still worth posting?
 *
 * An event that has already finished is rejected by Google and, more to the
 * point, is an embarrassment on a public listing. Compared on the END date, so
 * a multi-day expo stays postable on its middle days.
 */
export function isPostableEvent(event: Pick<DirectoryEvent, "event_date" | "end_date">, now: Date = new Date()): boolean {
  const start = parseDate(event.event_date);
  if (!start) return false;
  const end = event.end_date ? parseDate(event.end_date) ?? start : start;
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  return isoOf(end) >= today;
}

/**
 * Events near enough to be plausible.
 *
 * City match rather than radius: we have coordinates, but a shop owner deciding
 * whether to mention an event thinks in terms of "is it here", and a Houston
 * barber has no business posting about a Connecticut expo.
 */
export function eventsNear(events: DirectoryEvent[], city: string | null | undefined, now: Date = new Date()): DirectoryEvent[] {
  const target = (city || "").trim().toLowerCase();
  return events
    .filter((e) => isPostableEvent(e, now))
    .filter((e) => !target || (e.city || "").trim().toLowerCase() === target)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** "September 13" / "June 6–8" — read by a customer, not a parser. */
export function describeDates(event: Pick<DirectoryEvent, "event_date" | "end_date">): string {
  const s = parseDate(event.event_date);
  if (!s) return "";
  const e = event.end_date ? parseDate(event.end_date) : null;
  if (!e || isoOf(e) === isoOf(s)) return `${MONTHS[s.month - 1]} ${s.day}`;
  if (e.month === s.month) return `${MONTHS[s.month - 1]} ${s.day}–${e.day}`;
  return `${MONTHS[s.month - 1]} ${s.day} – ${MONTHS[e.month - 1]} ${e.day}`;
}

/**
 * The body copy for an attendance post.
 *
 * Written as the shop's own news. It deliberately does NOT reproduce the
 * event's marketing description: that copy belongs to the organiser, it would
 * be identical across every shop that posted it, and a customer reading a
 * barbershop's listing wants to know what it means for them.
 *
 * The closure line is the part that actually matters to a customer, and it's
 * the owner's to state — we don't know their staffing.
 */
export function buildAttendanceSummary(event: DirectoryEvent, businessName: string): string {
  const when = describeDates(event);
  const where = event.venue_name ? ` at ${event.venue_name}` : event.city ? ` in ${event.city}` : "";
  return [
    `We'll be at ${event.title.replace(/\s+-\s+.*$/, "").trim()} on ${when}${where}.`,
    "",
    `Come and say hello if you're going. ${businessName}`,
  ].join("\n");
}
