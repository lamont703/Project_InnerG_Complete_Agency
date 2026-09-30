import { buildInstagramCaption, type CopyRow } from "@/lib/admin/publisher-copy";

/**
 * The agency publisher's rules, pure (lib/agency-publisher.ts does the rest).
 * Same slots as /admin/content-publisher; the agency picks which of them to use.
 */

export const AGENCY_SLOT_HOURS = [9, 14, 19] as const;
export const SLOT_LABEL: Record<number, string> = { 9: "9:00 AM ET", 14: "2:00 PM ET", 19: "7:00 PM ET" };
export const CAPTION_MAX = 2200;

/**
 * The caption an agency's repost starts with: ours, credited to @shearquery
 * (it's our video on their feed), plus the Monday training — Instagram
 * captions can't carry a working link, so it points to the link in their bio,
 * where their /live/<CODE> link belongs.
 */
export function defaultAgencyCaption(row: CopyRow): string {
  const ours = buildInstagramCaption(row).replace(/\n*Pass rates, kit lists and state board guides — link in bio\.\n*/g, "\n\n").trim();
  const extra = "🔴 Free LIVE AI training for barbers & stylists — every Monday, 3 PM ET. Link in bio.\n🎥 Video: @shearquery";
  const text = `${ours}\n\n${extra}`;
  return text.length <= CAPTION_MAX ? text : `${ours.slice(0, CAPTION_MAX - extra.length - 4)}…\n\n${extra}`;
}

export function parseSlotHours(input: unknown): number[] | null {
  const arr = Array.isArray(input) ? input : String(input ?? "").split(/[,\s]+/);
  const hours = [...new Set(arr.map((x) => {
    const s = String(x).trim().toLowerCase();
    if (/^(9|9am|9:00am|morning)$/.test(s)) return 9;
    if (/^(14|2|2pm|2:00pm|afternoon)$/.test(s)) return 14;
    if (/^(19|7|7pm|7:00pm|evening)$/.test(s)) return 19;
    return NaN;
  }).filter((n) => !Number.isNaN(n)))].sort((a, b) => a - b);
  return hours.length ? hours : null;
}

/**
 * Which post goes out in which of the next few slots — the mapping, like the
 * content publisher shows, because "next post 2 PM" isn't something you can
 * check; "2 PM → this video" is.
 */
export function upcomingSlots(opts: { easternHour: number; slotHours: number[]; paused: boolean; queueTitles: string[]; count?: number }): { label: string; title: string | null }[] {
  if (opts.paused || !opts.slotHours.length) return [];
  const hours = [...opts.slotHours].sort((a, b) => a - b);
  const seq: { day: string; h: number }[] = [];
  for (let d = 0; seq.length < (opts.count ?? 3) && d < 7; d++) {
    for (const h of hours) {
      if (d === 0 && h <= opts.easternHour) continue;
      seq.push({ day: d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`, h });
    }
  }
  return seq.slice(0, opts.count ?? 3).map((s, i) => ({ label: `${s.day} ${SLOT_LABEL[s.h]}`, title: opts.queueTitles[i] ?? null }));
}
