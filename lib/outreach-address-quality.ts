/**
 * Which scraped addresses are safe to email.
 *
 * A CRAWLER FINDS TEXT SHAPED LIKE AN EMAIL, not an email. Reviewing the first
 * real target list turned up, in 49 rows: `user@domain.com` (a theme
 * placeholder nobody replaced), `hello@nelson.com` (the same, from a WordPress
 * theme called Nelson), `impallari@gmail.com` — the font designer Pablo
 * Impallari, whose address ships inside Google Fonts licence files and has
 * nothing to do with a barber college — and `sarahbrown@gmail.com` on three
 * unrelated schools, which is a shared site template rather than three
 * coincidences.
 *
 * That is roughly a quarter of the list. Sending to it means hard bounces
 * against a new sending domain, a stranger receiving mail about a school he has
 * never heard of, and a first campaign that reads as careless to exactly the
 * audience we are trying to earn standing with. The filter is not tidiness; it
 * is the difference between outreach and spray.
 *
 * ONE EMAIL PER ADDRESS, NOT PER SCHOOL. Bella Beauty College has five campuses
 * sharing one inbox. Five near-identical messages arriving together is how a
 * real recipient decides we are a bot — so campuses collapse to a single send.
 *
 * WHY THIS IS A MODULE AND NOT A FEW LINES IN THE SENDER. It is the gate that
 * decides whether a real person gets an unsolicited email, so it is testable in
 * isolation and cannot be quietly skipped by a caller in a hurry.
 */

/**
 * Addresses that are placeholders, boilerplate, or belong to someone who merely
 * wrote software the site uses. Matched on the full address or its domain.
 */
const PLACEHOLDER = [
  /^(user|you|your|name|email|someone|somebody|test|demo|sample|admin)@/i,
  /@(domain|example|yourdomain|yoursite|website|company|email|test|localhost)\.(com|org|net|test|local)$/i,
  /^(hello|info|contact)@(nelson|theme|template|demo|placeholder)\./i,
  // Ships inside Google Fonts licence text; appears on any site using his faces.
  /^impallari@/i,
  /^(fontawesome|support@wordpress|noreply@|no-reply@|donotreply@)/i,
  /@(sentry|wixpress|godaddy|squarespace|shopify|wordpress)\./i,
];

/** Roles that reach a mailbox nobody reads, or one we should not write to. */
const UNREACHABLE_ROLE = /^(abuse|postmaster|webmaster|privacy|legal|dmca|security|spam)@/i;

/**
 * Institutions that are not businesses with an owner to reach.
 *
 * Extends the crawler's own K-12 exclusion, which matched "high school" and
 * "ISD" but missed a "Center of Technology" on a schools.net domain, and a
 * prison education system (Windham School District, part of TDCJ) whose
 * cosmetology programme has no listing anyone would claim.
 */
const WRONG_AUDIENCE_DOMAIN = /(^|\.)(k12\.|.*isd\.|.*schools\.(net|org)$|wsdtx\.org$|.*\.edu$)/i;
const WRONG_AUDIENCE_NAME =
  /high school|\bisd\b|school district|center of technology|career (and|&) technology|correctional|windham/i;

export interface AddressVerdict {
  ok: boolean;
  /** Why it was refused — surfaced in the preview so the list can be audited. */
  reason?: "placeholder" | "unreachable_role" | "wrong_audience" | "shared_across_schools" | "duplicate";
}

/** Judge one address in isolation. */
export function judgeAddress(email: string, schoolName = "", ): AddressVerdict {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, reason: "placeholder" };
  if (PLACEHOLDER.some((r) => r.test(e))) return { ok: false, reason: "placeholder" };
  if (UNREACHABLE_ROLE.test(e)) return { ok: false, reason: "unreachable_role" };

  const domain = e.split("@")[1] || "";
  if (WRONG_AUDIENCE_DOMAIN.test(domain) || WRONG_AUDIENCE_NAME.test(schoolName)) {
    return { ok: false, reason: "wrong_audience" };
  }
  return { ok: true };
}

export interface Candidate {
  email: string;
  schoolName: string;
  /** Anything the caller wants back on the accepted rows. */
  [k: string]: unknown;
}

/**
 * Judge the whole list, because two of the failure modes are only visible
 * across rows: an address shared by unrelated schools, and one shared by
 * campuses of the same school.
 *
 * A shared address is not automatically wrong — Bella Beauty College really
 * does run five campuses from one inbox. The distinction is the NAME: campuses
 * of one school share a stem, three unrelated schools sharing an address means
 * a template. So the same address on similar names collapses to one send, and
 * on dissimilar names is refused outright.
 */
export function selectSendable<T extends Candidate>(
  candidates: T[]
): { sendable: T[]; refused: { candidate: T; reason: string }[] } {
  const sendable: T[] = [];
  const refused: { candidate: T; reason: string }[] = [];

  const byAddress = new Map<string, T[]>();
  for (const c of candidates) {
    const e = String(c.email || "").trim().toLowerCase();
    byAddress.set(e, [...(byAddress.get(e) || []), c]);
  }

  for (const [email, group] of byAddress) {
    const verdict = judgeAddress(email, group[0]?.schoolName);
    if (!verdict.ok) {
      group.forEach((c) => refused.push({ candidate: c, reason: verdict.reason! }));
      continue;
    }

    if (group.length === 1) {
      const solo = judgeAddress(email, group[0].schoolName);
      if (!solo.ok) refused.push({ candidate: group[0], reason: solo.reason! });
      else sendable.push(group[0]);
      continue;
    }

    // Same first significant word across the group => campuses of one school.
    const stem = (n: string) => (n || "").toLowerCase().replace(/[^a-z ]/g, "").split(/\s+/).slice(0, 2).join(" ");
    const stems = new Set(group.map((c) => stem(c.schoolName)));
    if (stems.size === 1) {
      // One send for the chain; the rest are duplicates, not rejects.
      sendable.push(group[0]);
      group.slice(1).forEach((c) => refused.push({ candidate: c, reason: "duplicate" }));
    } else {
      group.forEach((c) => refused.push({ candidate: c, reason: "shared_across_schools" }));
    }
  }

  return { sendable, refused };
}
