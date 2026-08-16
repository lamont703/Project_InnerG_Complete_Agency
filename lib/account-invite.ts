/**
 * The post-conversion account offer — what each conversion is worth, and what
 * the account arrives holding.
 *
 * THE PRINCIPLE. The ask goes AFTER the conversion, never before it. Putting a
 * signup between a customer and a booking request costs a real appointment for
 * a real business, at exactly the point we are trying to prove the marketplace
 * works at all. Whatever an account is worth, it is not worth that.
 *
 * WE DO NOT NEED TO ASK FOR ANYTHING. Every conversion below already collected
 * an email — usually a name and phone too, which is more than the signup form
 * asks for. The only missing piece is a password, and magic links mean one need
 * never exist.
 *
 * THE ACCOUNT MUST ARRIVE WITH SOMETHING IN IT. Seven accounts exist today and
 * between them they hold one journey and one chat thread, because signing up
 * leads to a blank page. `opensWith` below is the promise made at the moment of
 * the offer, and every entry has to be able to keep it.
 *
 * AUDIENCE IS INFERRED, NEVER ASKED. Six of seven members have audience NULL —
 * that is what asking people to self-identify produces. What they just DID is
 * better evidence than what they would have ticked.
 *
 * Pure data and copy. The sending, the identity check and the back-linking all
 * live in the route, because they need the service role and the session.
 */
import type { AudienceId } from "@/lib/audiences";

export type InviteSource =
  | "booking"
  | "school_tour"
  | "pass_rate_alert"
  | "shortlist"
  | "review"
  | "gbp_audit";

export interface InviteConfig {
  /** Table the email is read from, server-side. Never supplied by the client. */
  table: string;
  /** Column on that table holding the address. */
  emailColumn: string;
  /**
   * Audience stamped on the account. Null where the conversion genuinely does
   * not say — a shortlist is saved by consumers and owners alike, and guessing
   * wrong is worse than leaving it open for the next signal.
   */
  audience: AudienceId | null;
  /** Heading on the offer. Names what they get, not what we want. */
  headline: string;
  /** The concrete thing waiting in the account. Has to be true. */
  opensWith: string;
}

export const INVITE_SOURCES: Record<InviteSource, InviteConfig> = {
  booking: {
    table: "booking_requests",
    emailColumn: "customer_email",
    // The person booking a haircut is not a student or an owner. `professional`
    // would be wrong and `student` badly wrong, so this stays null until they
    // do something that says otherwise.
    audience: null,
    headline: "Track this request",
    opensWith: "your request, and whether the business has confirmed it",
  },
  school_tour: {
    table: "booking_requests",
    emailColumn: "customer_email",
    // Asking to tour a barber or cosmetology school is about as clear a student
    // signal as this site produces.
    audience: "student",
    headline: "Keep track of the schools you're looking at",
    opensWith: "your tour request, plus the pass rates for that school",
  },
  pass_rate_alert: {
    table: "school_pass_rate_alerts",
    emailColumn: "email",
    audience: "student",
    headline: "Manage your alerts",
    opensWith: "the schools you're watching, and their latest numbers",
  },
  shortlist: {
    table: "shortlists",
    emailColumn: "email",
    audience: null,
    headline: "Keep your shortlist",
    opensWith: "your saved list, on any device",
  },
  review: {
    table: "shearquery_reviews",
    emailColumn: "email",
    audience: null,
    headline: "Keep track of your reviews",
    opensWith: "the reviews you've written",
  },
  gbp_audit: {
    table: "gbp_public_audit_runs",
    emailColumn: "email",
    // Running a diagnostic on a listing is the strongest ownership signal on
    // the site — stronger than clicking "claim", which costs nothing.
    audience: "owner",
    headline: "Claim this listing",
    opensWith: "your audit, your booking requests and your listing insights",
  },
};

export function inviteConfig(source: string): InviteConfig | null {
  return (INVITE_SOURCES as Record<string, InviteConfig>)[source] ?? null;
}

/**
 * Where the magic link lands.
 *
 * Deep-linked per source so the first thing they see is the thing they were
 * promised. A generic /account landing is how an account becomes a blank page.
 */
export function landingPath(source: InviteSource): string {
  switch (source) {
    case "booking":
    case "school_tour":
      return "/account/my-requests";
    case "pass_rate_alert":
      return "/account/my-requests?tab=alerts";
    case "gbp_audit":
      return "/account/booking-requests";
    case "shortlist":
    case "review":
    default:
      return "/account/my-requests";
  }
}
