/**
 * Booking links — the "Book" button on a Google listing.
 *
 * Narrow by design: for a barbershop or salon Google offers exactly one action
 * type, APPOINTMENT, and a listing has at most a handful of links. That makes
 * this the simplest write surface in the set — a URL, not generated prose — and
 * the prerequisite for anything that wants a Book call-to-action later.
 *
 * The judgement worth encoding is which URLs are worth putting behind that
 * button. A link to a Facebook page or to the shop's own Google listing wastes
 * the most valuable click on the profile, and a link to a homepage where
 * booking is three clicks down loses people who were ready to book.
 */

export type PlaceActionType = "APPOINTMENT" | "ONLINE_APPOINTMENT" | "DINING_RESERVATION" | string;

export interface PlaceActionLink {
  name?: string;
  uri: string;
  placeActionType: PlaceActionType;
  providerType?: "MERCHANT" | "AGGREGATOR_3P" | string;
  isEditable?: boolean;
  isPreferred?: boolean;
  createTime?: string;
  updateTime?: string;
}

export interface UrlIssue {
  level: "error" | "warning";
  message: string;
}

/** Hosts that are never a booking destination, however tempting. */
const NOT_BOOKING = [
  { re: /(^|\.)facebook\.com$/i, what: "a Facebook page" },
  { re: /(^|\.)instagram\.com$/i, what: "an Instagram profile" },
  { re: /(^|\.)tiktok\.com$/i, what: "a TikTok profile" },
  { re: /(^|\.)twitter\.com$|(^|\.)x\.com$/i, what: "an X profile" },
  { re: /(^|\.)yelp\.com$/i, what: "a Yelp page" },
  { re: /(^|\.)google\.com$|(^|\.)goo\.gl$|(^|\.)g\.page$/i, what: "a Google page" },
];

/**
 * Check a booking URL.
 *
 * Errors block; warnings don't. The homepage case is a warning rather than an
 * error because some shops genuinely do book from their front page — but it's
 * worth saying, since "Book" landing somewhere with no booking on it is a
 * wasted click and the owner usually hasn't noticed.
 */
export function validateBookingUrl(raw: string): { ok: boolean; issues: UrlIssue[]; normalized?: string } {
  const issues: UrlIssue[] = [];
  const text = (raw || "").trim();

  if (!text) return { ok: false, issues: [{ level: "error", message: "Enter a booking link." }] };

  let url: URL;
  try {
    url = new URL(text.includes("://") ? text : `https://${text}`);
  } catch {
    return { ok: false, issues: [{ level: "error", message: "That doesn't look like a web address." }] };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, issues: [{ level: "error", message: "The link must start with https://" }] };
  }
  if (url.protocol === "http:") {
    issues.push({ level: "warning", message: "This link isn't secure (http). Use https:// if your site supports it." });
  }

  const host = url.hostname.replace(/^www\./i, "");
  for (const { re, what } of NOT_BOOKING) {
    if (re.test(host)) {
      issues.push({
        level: "error",
        message: `That's ${what}, not a booking page. The Book button should take someone straight to booking.`,
      });
      return { ok: false, issues };
    }
  }

  if (url.pathname === "/" || url.pathname === "") {
    issues.push({
      level: "warning",
      message: "This points at your homepage. If booking is further in, link straight to the booking page instead.",
    });
  }

  return { ok: !issues.some((i) => i.level === "error"), issues, normalized: url.toString() };
}

/**
 * Whether we're allowed to change a link.
 *
 * Links created by a booking provider come back with isEditable false — they're
 * owned by that integration, and an owner has to change them at the source.
 * Presenting them as editable would produce a save that silently does nothing.
 */
export function isEditable(link: PlaceActionLink): boolean {
  return link.isEditable !== false && (link.providerType ?? "MERCHANT") === "MERCHANT";
}

export interface BookingState {
  links: PlaceActionLink[];
  editable: PlaceActionLink[];
  locked: PlaceActionLink[];
  /** Types Google offers for this location that have no link yet. */
  missingTypes: { placeActionType: PlaceActionType; displayName: string }[];
  hasBooking: boolean;
}

export function buildBookingState(
  links: PlaceActionLink[],
  availableTypes: { placeActionType: PlaceActionType; displayName: string }[]
): BookingState {
  const present = new Set(links.map((l) => l.placeActionType));
  return {
    links,
    editable: links.filter(isEditable),
    locked: links.filter((l) => !isEditable(l)),
    missingTypes: availableTypes.filter((t) => !present.has(t.placeActionType)),
    hasBooking: links.length > 0,
  };
}
