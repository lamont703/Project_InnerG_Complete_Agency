/**
 * Scheduling posts.
 *
 * The judgement here is about time passing between approval and publication.
 * Everything else in this feature validates a post at the moment an owner
 * presses publish, when what they see is what goes out. A scheduled post is
 * approved once and published days later, and in that gap an offer can expire,
 * an event can finish, and a listing can be disconnected.
 *
 * So a scheduled post is checked twice: once when it's queued, and again by the
 * publisher immediately before it goes out. The second check is the one that
 * matters — publishing an offer that ran out last Tuesday is worse than not
 * publishing at all, because it reaches customers with the shop's name on it.
 *
 * Pure — no network.
 */

export const SCHEDULE_MAX_DAYS = 90;
/** Below this, "schedule" is just a slow publish and the owner should press the button. */
export const SCHEDULE_MIN_MINUTES = 10;

export interface ScheduleIssue {
  level: "error" | "warning";
  message: string;
}

/** Can this be queued for that moment? */
export function validateSchedule(scheduledFor: Date | string, now: Date = new Date()): {
  ok: boolean;
  issues: ScheduleIssue[];
} {
  const issues: ScheduleIssue[] = [];
  const when = scheduledFor instanceof Date ? scheduledFor : new Date(scheduledFor);

  if (Number.isNaN(when.getTime())) {
    return { ok: false, issues: [{ level: "error", message: "That isn't a valid date and time." }] };
  }

  const minutes = (when.getTime() - now.getTime()) / 60_000;

  if (minutes < SCHEDULE_MIN_MINUTES) {
    issues.push({
      level: "error",
      message:
        minutes < 0
          ? "That time has already passed."
          : `Pick a time at least ${SCHEDULE_MIN_MINUTES} minutes out, or just publish it now.`,
    });
  }

  if (minutes / 1440 > SCHEDULE_MAX_DAYS) {
    issues.push({
      level: "error",
      message: `That's more than ${SCHEDULE_MAX_DAYS} days away. Queue it nearer the time — what's true about your shop today may not be by then.`,
    });
  }

  return { ok: !issues.some((i) => i.level === "error"), issues };
}

export interface ScheduledPostPayload {
  event?: { schedule?: { endDate?: { year: number; month: number; day: number } } } | null;
  offer?: unknown | null;
}

/**
 * Is this still worth publishing, at the moment it comes due?
 *
 * Called by the publisher, not the scheduler. An EVENT or OFFER post carries a
 * window, and a window that closed while the post sat in the queue makes the
 * post actively misleading — an offer customers can't use, an event already
 * over. Those are dropped rather than published late.
 *
 * A plain post has no window and is always still fine: "we do fades" doesn't
 * expire.
 */
export function isStillPublishable(
  payload: ScheduledPostPayload,
  now: Date = new Date()
): { publishable: boolean; reason?: string } {
  const end = payload.event?.schedule?.endDate;
  if (!end) return { publishable: true };

  // Compared on the whole day: an offer valid "until the 31st" is valid all of
  // the 31st, and expiring it at midnight UTC would cut a day off in every US
  // timezone.
  const endOfDay = Date.UTC(end.year, end.month - 1, end.day, 23, 59, 59);
  if (now.getTime() > endOfDay) {
    return {
      publishable: false,
      reason: payload.offer
        ? "the offer expired before this was due to publish"
        : "the event finished before this was due to publish",
    };
  }
  return { publishable: true };
}

/** How a pending post reads in the queue list. */
export function describeSchedule(scheduledFor: string, now: Date = new Date()): string {
  const when = new Date(scheduledFor);
  if (Number.isNaN(when.getTime())) return "";
  const mins = Math.round((when.getTime() - now.getTime()) / 60_000);
  if (mins < 0) return "due now";
  if (mins < 60) return `in ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Suggested slots for a drip.
 *
 * Weekly, because posts age out of the feed in about a week — the gap is set by
 * how long a post survives, not by a marketing calendar. Offered at the same
 * time of day the owner is scheduling, so nothing arrives at 3am.
 */
export function suggestedSlots(now: Date = new Date(), count = 4): Date[] {
  return Array.from({ length: count }, (_, i) => new Date(now.getTime() + (i + 1) * 7 * 86_400_000));
}
