/**
 * The cold email sent to a barber or cosmetology school.
 *
 * THE ASK IS VERIFICATION, NOT A PITCH — and that is the whole design. We hold
 * this school's 2026 TDLR pass rates and the statewide average to set them
 * against. Their own site almost never publishes those numbers (71% of
 * crawled sites don't), students ask about them constantly, and our page is
 * where they will find them. So the email shows them their own figures and asks
 * whether anything is wrong.
 *
 * That shape does four things a "claim your listing" email cannot:
 *
 *   1. It leads with something only we can give them, so it cannot be confused
 *      with the SEO spam every administrator already deletes.
 *   2. Being asked to check a fact about yourself is low-friction. Being asked
 *      to sign up is not.
 *   3. A REPLY IS THE TRUST GATE. school_site_crawl.confirmed_at is set only
 *      when a school replies — that reply is the sole evidence the scraped
 *      address belongs to them. The email's primary ask and the thing we need
 *      most are therefore the same action.
 *   4. It is honest about the asymmetry. We are publishing numbers about their
 *      business; giving them the first look is what we would want.
 *
 * NO RATE, NO EMAIL. buildSchoolOutreachEmail returns null when we hold no 2026
 * figure. The hook IS the message — without it this degrades into exactly the
 * generic solicitation the design exists to avoid, and sending it would burn
 * both the address and the sending domain for nothing.
 *
 * CAN-SPAM IS ENFORCED HERE, NOT REMEMBERED. The FTC requires a commercial
 * email to identify itself as an advertisement, carry a valid physical postal
 * address, and offer a working opt-out honoured within 10 business days
 * (ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business —
 * and note it "makes no exception for business-to-business email"). Those are
 * appended by this function rather than left to whoever writes the copy, and a
 * missing postal address throws instead of sending a non-compliant message.
 *
 * Pure — no network, no React, no database. Tested, because this is a message
 * about a real business's exam results going out under our name.
 */

export interface SchoolOutreachInput {
  schoolName: string;
  city?: string | null;
  /** "barber" or "cosmetology" — only changes the noun in the comparison. */
  discipline: "barber" | "cosmetology";
  /** 2026 TDLR written pass rate, a FRACTION. See pct(). */
  writtenRate?: number | null;
  practicalRate?: number | null;
  /** How many candidates sat it. A rate over 4 people is not a rate. */
  writtenTestTakers?: number | null;
  /**
   * Statewide written pass rate for this discipline, a FRACTION, weighted by
   * cohort. Replaces the league position this originally carried — see
   * RANK_IS_NOT_DEFENSIBLE in the body.
   */
  stateAverageRate?: number | null;
  /** How many schools that average covers, so the claim can be cited. */
  stateAverageSchools?: number | null;
  /** Absolute URL of their page on the directory. */
  listingUrl: string;
  /** Absolute URL that unsubscribes this address in one click. */
  unsubscribeUrl: string;
}

export interface OutreachSender {
  /** Person the email is from — a name, because a school replies to people. */
  fromName: string;
  /** CAN-SPAM: a real street address, PO box, or registered private mailbox. */
  postalAddress: string;
}

/**
 * Below this, a percentage is noise. Four candidates sitting an exam produces
 * rates of 0/25/50/75/100 and a rank that swings wildly year to year — quoting
 * it back to a school as a finding would be indefensible the first time one of
 * them checked the arithmetic.
 */
export const MIN_TEST_TAKERS = 5;

/**
 * THE COLUMNS HOLD FRACTIONS. A school where everyone passes stores 1, not 100.
 * Same defensive rule as percentClause() in lib/seo-description.ts and pct() in
 * lib/school-companion.ts, so the three cannot disagree if the column is ever
 * rescaled. Getting this wrong once already produced "1.0% pass" for a school
 * with a perfect record.
 */
const pct = (n: number) => {
  const raw = Number(n);
  return `${Math.round(raw <= 1 ? raw * 100 : raw)}%`;
};

export interface OutreachEmail {
  subject: string;
  text: string;
  /** The same message as HTML — GHL sends HTML, so both come from one source. */
  html: string;
}

/**
 * Compose it, or return null if this school should not be emailed.
 *
 * Null is a real outcome and callers must handle it: no 2026 rate, or too few
 * test-takers for the number to mean anything.
 */
export function buildSchoolOutreachEmail(
  school: SchoolOutreachInput,
  sender: OutreachSender
): OutreachEmail | null {
  if (school.writtenRate == null) return null;
  if (school.writtenTestTakers != null && school.writtenTestTakers < MIN_TEST_TAKERS) return null;

  if (!sender.postalAddress?.trim()) {
    // Loud, because the alternative is a silently non-compliant send at volume.
    throw new Error(
      "CAN-SPAM requires a valid physical postal address in every commercial email. Set OUTREACH_POSTAL_ADDRESS."
    );
  }

  const name = school.schoolName.trim();
  const written = pct(school.writtenRate);

  const lines: string[] = [];
  lines.push(`Hi ${name},`);
  lines.push("");
  lines.push(
    "We run ShearQuery, a free directory of Texas barber and cosmetology schools. Your school has a page on it, and I'd rather you saw these numbers before more students do."
  );
  lines.push("");
  lines.push(`From the 2026 TDLR exam results, ${name} shows:`);
  lines.push(
    `  - Written exam: ${written} pass${
      school.writtenTestTakers ? ` (${school.writtenTestTakers} test-takers)` : ""
    }`
  );
  if (school.practicalRate != null) {
    lines.push(`  - Practical exam: ${pct(school.practicalRate)} pass`);
  }

  /*
   * RANK_IS_NOT_DEFENSIBLE ON THIS DATA, which is why this says "the state
   * average was X" instead of "you are 42nd of 69".
   *
   * The cohorts are tiny. Of 135 barber schools holding a 2026 written rate the
   * median cohort is FIVE candidates and only 12 have twenty or more, so the
   * top of any league table is n=1 and n=3 programmes at 100% sitting above
   * every real school in the state. Publishing that position to the schools
   * themselves invites the one reply we could not answer, and the first
   * administrator to check the arithmetic would be right to dismiss everything
   * else in the message.
   *
   * It was also hostile in the half of cases where it worked. "You rank 42nd of
   * 69" is a true fact that reads as a threat, and we are asking these schools
   * for a correction, not daring them to respond. A statewide average is a fact
   * about the state rather than a verdict on them: the reader does their own
   * comparison, which is both fairer and likelier to earn a reply.
   */
  if (school.stateAverageRate != null) {
    lines.push("");
    lines.push(
      `For context, the 2026 statewide written pass rate for ${school.discipline} schools was ${pct(
        school.stateAverageRate
      )}${school.stateAverageSchools ? ` across ${school.stateAverageSchools} schools` : ""}.`
    );
  }

  // A five-candidate cohort is a real number and a fragile one. Saying so is
  // what makes the rest of the message credible to someone who knows their own
  // enrollment better than we do.
  if (school.writtenTestTakers != null && school.writtenTestTakers < 10) {
    lines.push("");
    lines.push(
      `That's a small cohort, so one or two candidates move it a lot — worth saying rather than presenting it as settled.`
    );
  }

  lines.push("");
  lines.push(
    "Students ask about pass rates constantly, and our page is where a lot of them will find yours. So: if anything above is wrong or out of date, just reply to this email and we'll fix it."
  );
  lines.push("");
  lines.push(`Your page: ${school.listingUrl}`);
  lines.push("");
  lines.push(
    "You can also claim the page for free to edit your hours, photos and description yourself."
  );
  lines.push("");
  lines.push(`- ${sender.fromName}, ShearQuery`);

  // --- CAN-SPAM block. Appended structurally so it cannot be forgotten. ---
  lines.push("");
  lines.push("---");
  lines.push("This message is an advertisement.");
  lines.push(`ShearQuery, ${sender.postalAddress.trim()}`);
  lines.push(
    `To stop receiving email from us, use this link: ${school.unsubscribeUrl} - or reply with "unsubscribe". We honour opt-outs within 10 business days.`
  );

  // Accurate rather than enticing: the subject names the school and says
  // exactly what is inside, which is both the legal standard and the reason
  // it gets opened by the person it is meant for.
  const subject = `${name}: your 2026 TDLR pass rates (${written} written)`;

  const text = lines.join("\n");

  /*
   * HTML built from the SAME lines, so the two bodies cannot drift and the
   * CAN-SPAM block cannot end up in one and not the other. Deliberately plain:
   * a message claiming to come from a person should look like one, and a
   * templated banner is the first thing that marks an email as bulk.
   */
  const esc = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const linkify = (t: string) =>
    esc(t).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>');
  const html =
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111">` +
    lines
      .map((l) =>
        l === ""
          ? "<div style=\"height:12px\"></div>"
          : l === "---"
          ? '<hr style="border:none;border-top:1px solid #ddd;margin:16px 0">'
          : l.startsWith("  - ")
          ? `<div style="margin-left:16px">&bull; ${linkify(l.slice(4))}</div>`
          : `<div>${linkify(l)}</div>`
      )
      .join("") +
    `</div>`;

  return { subject, text, html };
}
