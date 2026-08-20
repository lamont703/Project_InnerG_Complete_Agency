/**
 * How one queued item is worded on each platform.
 *
 * SPLIT OUT OF THE CRON, NOT INVENTED HERE. buildYouTubeDescription and
 * buildInstagramCaption lived inside app/api/cron/publish-content/route.ts and
 * are moved verbatim, for two reasons: the route now has six destinations and
 * was becoming mostly text-assembly, and these are the parts most worth unit
 * testing — a caption one character over a platform's limit is a 400 with no
 * hint about which field.
 *
 * THE QUEUE HOLDS WHAT THE VIDEO SAYS; THIS HOLDS HOW IT IS LISTED. That
 * division is the reason the wording can be improved for every future post
 * without re-rendering or re-queueing anything, and it is why row.caption is
 * honoured when set — someone wrote a specific one on purpose.
 *
 * ONE STRING WOULD MAKE ALL SIX WORSE. A YouTube description is read after the
 * click and carries the link. An Instagram caption is read in the feed and
 * cannot carry a working one. X gets 280 characters total. A Google Post is
 * read by somebody looking at a business listing on Maps, and has a button
 * instead of a link. These are different jobs.
 */

import { fitToXLimit } from "@/lib/x-publish";
import { GBP_SUMMARY_LIMIT } from "@/lib/gbp-brand-publish";
import { TIKTOK_TITLE_LIMIT } from "@/lib/tiktok-publish";

export const SITE = "https://shearquery.com";

/** The shape the copy builders read. Kept loose — this is a queue row. */
export interface CopyRow {
  title?: string | null;
  stat?: string | null;
  label?: string | null;
  question?: string | null;
  caption?: string | null;
}

/** "62% pass rate" + "Texas barber written exam", with the gaps handled. */
function headline(row: CopyRow): string {
  return `${row.stat ?? ""} ${row.label ?? ""}`.trim();
}

export const YOUTUBE_TAGS = [
  "barber state board", "barber exam", "texas barber license",
  "barber school", "barber state board practical", "barber written exam",
  "cosmetology state board", "beauty school", "barber apprentice",
];

export function buildYouTubeDescription(row: CopyRow): string {
  return [
    headline(row),
    "",
    row.question ?? "",
    "Tell us below.",
    "",
    "Full pass rates, kit lists and state board guides:",
    SITE,
    "",
    "#Shorts #barber #barberschool #stateboard #cosmetology",
  ].join("\n");
}

export function buildInstagramCaption(row: CopyRow): string {
  if (row.caption) return row.caption;
  return [
    headline(row),
    "",
    row.question ?? "",
    "",
    "Pass rates, kit lists and state board guides — link in bio.",
    "",
    "#barber #barberschool #barbershop #stateboard #cosmetology #beautyschool #barberlife",
  ].join("\n");
}

/**
 * LinkedIn reads as a professional feed post, so it gets the context the
 * platform-native captions leave out — who the number is about and why it is
 * worth a licensing professional's attention. Hashtags are kept to three;
 * LinkedIn's own guidance treats them as topical signals, not reach hacks.
 */
export function buildLinkedInCommentary(row: CopyRow): string {
  return [
    headline(row),
    "",
    row.question ?? "",
    "",
    "We track pass rates, kit lists and state board requirements across every licence Texas issues — and increasingly beyond it.",
    "",
    SITE,
    "",
    "#barbering #cosmetology #vocationaltraining",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");
}

/**
 * X gets 280 characters for everything, so this is built shortest-first and
 * trimmed, rather than written long and cut.
 *
 * THE LINK IS NOT FREE. X rewrites every URL to a t.co shortlink of a fixed
 * length — currently 23 characters — regardless of how long the original is.
 * So the budget is reserved for the link rather than measured from it, and the
 * headline and question compete for what is left.
 */
const T_CO_LENGTH = 23;

export function buildXText(row: CopyRow): string {
  const head = headline(row);
  const question = (row.question ?? "").trim();

  // 280 minus the link, minus the two newlines that separate it.
  const budget = 280 - T_CO_LENGTH - 2;
  const body = fitToXLimit([head, question].filter(Boolean).join(" — "), budget);

  return `${body}\n\n${SITE}`;
}

/**
 * A Google Post is read on a business listing in Search or Maps, by somebody
 * who is already looking at us. It gets a plain, complete sentence and no
 * hashtags — those read as social-network furniture on a local listing — and no
 * inline link, because the post carries a LEARN_MORE button instead.
 */
export function buildGbpSummary(row: CopyRow): string {
  const text = [
    headline(row),
    "",
    row.question ?? "",
    "",
    "See the full pass rates, kit lists and state board requirements on ShearQuery.",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n")
    .trim();

  return text.slice(0, GBP_SUMMARY_LIMIT);
}

/** TikTok reads like the Instagram caption; the ceiling is far higher. */
export function buildTikTokTitle(row: CopyRow): string {
  const text = row.caption
    ? row.caption
    : [
        headline(row),
        "",
        row.question ?? "",
        "",
        "#barber #barberschool #stateboard #cosmetology #beautyschool",
      ]
        .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
        .join("\n");

  return text.slice(0, TIKTOK_TITLE_LIMIT);
}
