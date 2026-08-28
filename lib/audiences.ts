/**
 * WHO THE MEMBERSHIP IS FOR — one registry, several audiences.
 *
 * The free membership was built for exactly one person: someone who owns a
 * listing and wants the verified badge on it. Every word on /membership said
 * so. That is a real audience and it stays, but it is not the audience the
 * traffic is. The kit-list and licensing guides pull students who are months
 * from a licence, own nothing, and correctly read "claim your listing" as
 * addressed to somebody else.
 *
 * So the audience is a parameter, not a rewrite. Adding the next one (school
 * administrators, licensed pros looking for a chair) means adding an entry
 * here — not forking the membership page, the signup route, the agent prompt
 * and the lifecycle emails four ways.
 *
 * WHY A `status` FIELD. Some audiences are pursued now and some are next.
 * Declaring a planned audience is how the shape gets designed before it ships
 * (the agent can already recognise a school administrator and say something
 * true about what it can't do yet), while `status` keeps it off the public
 * membership page until its benefits are real. A planned audience that renders
 * a benefits list is a promise nobody made.
 *
 * Pure — no network, no database, no React. Imported by the membership page,
 * the signup route, the chat route and the lifecycle emails alike.
 */

export type AudienceId =
  | "student"
  | "professional"
  | "owner"
  | "school"
  /**
   * Someone who books a haircut or a salon service. NOT in the trade.
   *
   * The first audience here that arrives without ever visiting /membership:
   * they are inferred from a completed booking request, server-side, and the
   * account is offered afterwards. That is why the agent brief below spends
   * its words on what NOT to say — without it, someone who booked a beard trim
   * gets answered with TDLR pass rates and asked to claim a listing.
   */
  | "service_customer";

/**
 * The audience assumed when nobody said otherwise.
 *
 * Deliberately `professional` rather than `student`: an un-parameterised visit
 * to /membership is the pre-existing behaviour, and the copy that behaviour
 * has always shown is the claim-your-listing copy. Changing the default would
 * silently repoint every existing link, ad and email at student framing.
 */
export const DEFAULT_AUDIENCE: AudienceId = "professional";

export interface AudienceBenefit {
  /** Lucide icon name, resolved by the page — this module stays React-free. */
  icon: "sparkles" | "badge-check" | "users" | "check-circle" | "calendar" | "map-pin" | "graduation-cap" | "bar-chart";
  title: string;
  body: string;
}

/**
 * The extra content an audience needs to stand up as its own page.
 *
 * PRESENCE OF THIS FIELD IS WHAT GRANTS A URL. It is deliberately not derived
 * from `status`: `service_customer` is live and must NOT have a landing page,
 * because that audience is inferred server-side from a completed booking and
 * never visits /membership. A door nobody walks through is still a door to
 * maintain.
 *
 * WHY THE FAQS AND LINKS ARE REQUIRED HERE RATHER THAN OPTIONAL. Google
 * clusters pages when "the primary content [is] very similar" and then picks
 * one to show — so five URLs that differ only by a headline, sharing a form and
 * a benefits shell, are the same near-duplicate problem the query-string
 * approach had, just moved from `?for=` to a path. Making this content part of
 * the type means an audience page that has nothing of its own to say cannot be
 * expressed.
 *   https://developers.google.com/search/docs/crawling-indexing/canonicalization
 */
export interface AudienceLanding {
  /** Segment under /membership. `/membership/students`, etc. */
  path: string;
  /** This page's own title and description — it is a landing page, not a variant. */
  metaTitle: string;
  metaDescription: string;
  /** Questions this audience actually asks. Primary content unique to this page. */
  faqs: { q: string; a: string }[];
  /** Real routes worth sending this audience to. Verified to exist. */
  nextLinks: { href: string; label: string; body: string }[];
}

export interface Audience {
  id: AudienceId;
  /**
   * `live` audiences appear on /membership and get their own onboarding.
   * `planned` ones exist so the agent and the data model already know the
   * shape, but nothing public promises them anything.
   */
  status: "live" | "planned";
  /** Short label for pickers and admin. */
  label: string;
  /** One line, first person — used on the audience switcher. */
  who: string;
  headline: string;
  subhead: string;
  /** Badge above the headline. */
  eyebrow: string;
  benefits: AudienceBenefit[];
  ctaLabel: string;
  /**
   * Handed to the agent so it knows who it is talking to. Kept to one
   * paragraph: this lands inside an already-long system prompt, and the
   * grounding rules there matter more than persona.
   */
  agentBrief: string;
  /** Which lifecycle email sequence this audience belongs to, if any. */
  lifecycleTrack: "student" | "owner" | null;
  /** Does signup collect a journey (see lib/member-journey.ts)? */
  collectsJourney: boolean;
  /**
   * Own page under /membership, if this audience has enough of its own to say.
   * Absent means it is reachable by `?for=` only.
   */
  landing?: AudienceLanding;
}

export const AUDIENCES: Record<AudienceId, Audience> = {
  service_customer: {
    id: "service_customer",
    status: "live",
    label: "Service customer",
    who: "I'm looking for a barber or salon",
    eyebrow: "Free — for customers",
    headline: "Know where your appointment actually stands",
    subhead:
      "A request isn't a confirmed appointment until the business says so. This is where you see which ones they've answered — free, no password.",
    benefits: [
      {
        icon: "calendar",
        title: "Every request in one place",
        body: "Appointments and school tours you've asked for, each with where it stands — waiting on them, confirmed, or declined so you know not to hold the time.",
      },
      {
        icon: "check-circle",
        title: "Told either way, quickly",
        body: "We text the business and chase them if they go quiet. When they answer, you get an email — including when the answer is no, which is the one nobody else tells you.",
      },
      {
        icon: "map-pin",
        title: "Their number when you want it",
        body: "Once you've sent a request, the business's own phone number is right there. No dead ends waiting on a callback that isn't coming.",
      },
      {
        icon: "sparkles",
        title: "Your shortlist, saved",
        body: "The places you were comparing stay compared, on any device, instead of living in six browser tabs.",
      },
    ],
    ctaLabel: "Create my free account",
    agentBrief:
      "You are talking to a CUSTOMER looking to book a barber or salon service — they are not in the trade. They are not a student, not a licensee and not a shop owner. Never pitch listing claims, verified badges, Google Business Profile, exam prep, kit lists or pass rates; all of those are for people in the industry and are noise to this person. Help them find somewhere good near them, understand what a service involves, and know where their booking request stands.",
    // No sequence exists for this audience. A track name here would enrol them
    // in student or owner emails, which is worse than sending nothing.
    lifecycleTrack: null,
    // There is no licence journey to collect — they are not getting licensed.
    collectsJourney: false,
  },

  student: {
    id: "student",
    status: "live",
    label: "Student",
    who: "I'm in barber or cosmetology school (or about to be)",
    eyebrow: "Free — for students",
    headline: "Your licence journey, with an AI that remembers it",
    subhead:
      "Free account. Tell it your school and your exam date once, and it stops being a search box and starts being something that knows where you are.",
    benefits: [
      {
        icon: "sparkles",
        title: "An AI that already knows your situation",
        body: "It knows your state, your licence track, your school and how far out your exam is — so you stop re-explaining yourself every time, and the answer you get is about your exam, not a generic one.",
      },
      {
        icon: "calendar",
        title: "Milestones that arrive before you need them",
        body: "Kit list, exam bulletin, application steps, then what the market actually pays near you — timed off your exam date instead of showing up after it would have helped.",
      },
      {
        icon: "bar-chart",
        title: "The numbers schools don't lead with",
        body: "Real TDLR pass rates for your school — first-attempt, not the eventually-passed figure — plus published penalty history, booth rent by ZIP, and who's hiring near you.",
      },
      {
        icon: "graduation-cap",
        title: "A Passport for the day you pass",
        body: "Everything you've told it becomes a professional profile shops can find, so licence day starts with a profile instead of a blank form.",
      },
    ],
    ctaLabel: "Create my free account",
    agentBrief:
      "You are talking to a barber or cosmetology STUDENT working toward a licence. Their questions are about school quality, exam readiness, cost, hours, and what the job actually pays once they pass. " +
      "Never pitch listing claims, verified badges or Google Business Profile to them UNPROMPTED — a question about exam prep must not turn into an owner pitch. " +
      "But do NOT refuse those things when they ask. Students in this trade rent booths and open shops, often before the ink dries on the licence, and telling someone we cannot help with their own business because a signup form says 'student' is worse than the pitch we are avoiding. If they raise claiming a listing or connecting Google, help them exactly as you would an owner and follow the OWNER_CONNECT_CONTEXT RULE. " +
      "Read member_journey_context for who they are and where they are in the process, and prefer the answer that is specific to their state, licence track, school and exam date over a general one.",
    lifecycleTrack: "student",
    collectsJourney: true,
    landing: {
      path: "students",
      metaTitle: "Free Account for Barber & Cosmetology Students — Track Your Licence",
      metaDescription:
        "A free ShearQuery account for barber and cosmetology students. Tell it your school and exam date once and get pass rates, kit lists and milestones timed to you.",
      faqs: [
        {
          q: "Do I need a licence to make an account?",
          a: "No. This is built for the part before the licence — school, exam prep and the job hunt that starts the day you pass. You can create an account on your first day of school or before you have picked one.",
        },
        {
          q: "What happens after I sign up?",
          a: "You are asked for your state, your licence track, your school and roughly when you sit the exam. That takes about a minute and it is what turns the account on — everything after it is timed off those four answers.",
        },
        {
          q: "Is it really free?",
          a: "Yes. No card, no trial period. The account stays free.",
        },
      ],
      nextLinks: [
        {
          href: "/tools/texas-barber-exam-practice-deck",
          label: "Texas barber written exam practice",
          body: "Practice questions in the style PSI uses on the Class A Barber written exam.",
        },
        {
          href: "/texas-school-leaderboard",
          label: "Texas school pass rates",
          body: "First-attempt pass rates by school — the figure schools tend not to lead with.",
        },
        {
          href: "/texas-barber-state-board-practical-exam-kit-list",
          label: "Practical exam kit list",
          body: "What to physically bring on the day of the Texas practical exam.",
        },
      ],
    }
  },

  professional: {
    id: "professional",
    status: "live",
    // Unchanged from what /membership has always said. This entry exists so
    // the default path renders from the registry like every other audience —
    // not because the copy needed revisiting.
    label: "Licensed professional",
    who: "I'm a licensed barber, stylist or beauty pro",
    eyebrow: "Free Community Tier",
    headline: "Join the ShearQuery Community",
    subhead:
      "Claim your profile, earn the verified badge, and be findable by the shops and clients already searching here.",
    benefits: [
      {
        icon: "badge-check",
        title: "Get the Verified Badge on Your Listing",
        body: "Claim your profile and earn the verified badge shown on your entity page — a clear signal to clients, shop owners, and hiring managers that it's owner-verified and up to date.",
      },
      {
        icon: "users",
        title: "Join a Real Industry Community",
        body: "You're joining a growing directory of barbers and beauty professionals across Texas, not a mailing list.",
      },
      {
        icon: "check-circle",
        title: "Free, Always",
        body: "No credit card, no trial period, no upsell. Community membership stays free.",
      },
    ],
    ctaLabel: "Create my free account",
    agentBrief:
      "You are talking to a licensed barber, stylist or beauty professional. Their questions are usually about where to work — booth rent, commission, which shops are hiring, what a chair costs in a given ZIP — and about keeping their licence current (renewal, continuing education).",
    lifecycleTrack: null,
    collectsJourney: false,
    landing: {
      path: "professionals",
      metaTitle: "Free Membership for Licensed Barbers & Stylists — Verified Badge",
      metaDescription:
        "A free ShearQuery membership for licensed barbers, stylists and beauty professionals. Claim your profile, earn the verified badge and be findable by shops that are hiring.",
      faqs: [
        {
          q: "What does the verified badge actually do?",
          a: "It shows on your entity page as a signal that the profile is owner-verified rather than scraped — for clients deciding where to go, and for shop owners deciding who to call.",
        },
        {
          q: "I already have a profile here I did not create. Is that a problem?",
          a: "No, that is the normal case. The directory is built from public records, so most profiles exist before their owner arrives. Claiming one takes it over rather than creating a duplicate.",
        },
        {
          q: "Will you contact me about work?",
          a: "We do not broker jobs. The account makes you findable and lets you see booth rent and hiring activity yourself; who reaches out is between you and them.",
        },
      ],
      nextLinks: [
        {
          href: "/search",
          label: "Search the directory",
          body: "Find your own listing, or look at shops and salons near you.",
        },
        {
          href: "/compare-shops",
          label: "Compare shops",
          body: "Side by side on the things that decide where you take a chair.",
        },
      ],
    }
  },

  owner: {
    id: "owner",
    status: "live",
    label: "Shop or salon owner",
    who: "I own or manage a shop or salon",
    eyebrow: "Free — for owners",
    headline: "Own your listing, and see your market",
    subhead:
      "Claim the listing, connect Google, and get the market report for your own address — talent pipeline, competition, and what rent looks like around you.",
    benefits: [
      {
        // FIRST, deliberately. Additive — nothing below was removed — but a
        // booking request is a named person waiting on a phone call, and the
        // owner arriving from that text needs to see it before the badge and
        // the market report. Everything described here already ships:
        // /account/booking-requests, the SMS reply handler, and the escalation
        // job that chases on their behalf.
        icon: "calendar",
        title: "Appointment requests, in one place",
        body: "Customers can request an appointment straight from your listing. You get a text with their name and number, and this is where you see every request, mark what you booked, and answer with a single Y or N. We chase the ones you miss and tell the customer either way.",
      },
      {
        icon: "badge-check",
        title: "Claim and verify your listing",
        body: "The verified badge, plus control of what the listing says about your shop.",
      },
      {
        icon: "map-pin",
        title: "Your own market report",
        body: "Talent pipeline, labor supply, competition and booth rent computed within a fixed radius of your address — not a national average.",
      },
      {
        icon: "bar-chart",
        title: "Google Business Profile tools",
        body: "Connect your profile for an audit, post scheduling, review replies and category checks.",
      },
    ],
    ctaLabel: "Claim my listing",
    /*
     * THIS USED TO BE ONE SENTENCE, and its silence was a bug. Asked whether it
     * could connect an owner's Google Business Profile, the assistant said no —
     * because nothing here told it the feature exists. It has shipped for
     * months and is described in `benefits` above, but benefit copy renders on
     * /membership and never reaches the model. The brief is the only thing it
     * reads about who it is talking to.
     *
     * What it may claim is bounded by owner_connect_context, which carries this
     * person's real listing and connection state. Everything named below is a
     * page that exists today — the same rule the benefit copy keeps, and it
     * matters more here because the assistant says these things to a customer
     * unprompted.
     */
    agentBrief:
      "You are talking to a shop or salon OWNER about their own business — hiring, booth rent, competition and their local market. " +
      "They can also do three things on here that other visitors cannot, and you should help with them when asked: claim their listing to get the verified badge and control what it says; connect their Google Business Profile for a profile audit, post scheduling, review replies and hours or category fixes; and receive appointment requests from their listing as a text with the customer's name and number. " +
      "Connecting Google takes the owner about a minute and is a link you give them — you cannot approve it for them, because Google requires them to sign in and consent on Google's own site. See the OWNER_CONNECT_CONTEXT RULE for what is true about this specific person.",
    lifecycleTrack: "owner",
    collectsJourney: false,
    landing: {
      path: "owners",
      metaTitle: "Free Membership for Barbershop & Salon Owners — Claim Your Listing",
      metaDescription:
        "A free ShearQuery membership for barbershop and salon owners. Claim your listing, take appointment requests, and see the talent pipeline and competition around your address.",
      faqs: [
        {
          q: "How do appointment requests reach me?",
          a: "A customer requests one from your listing and you get a text with their name and number. You answer with a single Y or N. Requests you miss get chased on your behalf, and the customer is told either way.",
        },
        {
          q: "Do I have to connect Google?",
          a: "No. Connecting a Google Business Profile is read-only and optional — it is what makes the market report specific to your address. The listing, the badge and appointment requests all work without it.",
        },
        {
          q: "What does it cost?",
          a: "Nothing. No card and no trial. Advertising is a separate, optional product and is never a condition of claiming your listing.",
        },
      ],
      nextLinks: [
        {
          href: "/compare-shops",
          label: "Compare shops",
          body: "See how the shops around you present themselves.",
        },
        {
          href: "/texas-school-leaderboard",
          label: "Texas school pass rates",
          body: "Where the licensed talent near you is actually coming from.",
        },
      ],
    }
  },

  school: {
    id: "school",
    // PLANNED. A school administrator can already be recognised by the agent,
    // and the data to serve them exists (pass rates, penalties, placement),
    // but nothing here is packaged as a membership benefit yet — so it stays
    // off /membership rather than making a promise.
    status: "planned",
    label: "School or instructor",
    who: "I teach at, or run, a barber or cosmetology school",
    eyebrow: "Coming soon — for schools",
    headline: "See how your graduates actually do",
    subhead:
      "Pass rates against the state, campus by campus, and where your graduates end up working.",
    benefits: [],
    ctaLabel: "Create my free account",
    agentBrief:
      "You are talking to a barber/cosmetology SCHOOL administrator or instructor asking about their own institution — pass rates against the statewide benchmark, testing volume, and graduate outcomes. Be precise about what is and is not known: per-school placement rate is NOT supported, and saying so plainly is the correct answer.",
    lifecycleTrack: null,
    collectsJourney: false,
  },
};

/** Every audience that may be shown to the public, in display order. */
/**
 * The audiences offered on the /membership switcher — NOT simply every audience
 * whose status is "live", which is what the name suggests and why this comment
 * exists.
 *
 * service_customer is live and its benefits ship, but it is deliberately absent
 * here. Nobody arrives at /membership to describe themselves as a haircut
 * customer; that audience is inferred server-side from a completed booking and
 * the account is offered afterwards. Adding a fourth tab would invite a
 * self-select that is not the path, on the page whose entire job is converting
 * the other three.
 *
 * If a customer-facing signup entry point is ever wanted, add it here on
 * purpose rather than deriving this list from `status` — the two answer
 * different questions.
 */
/**
 * Audiences with their own page under /membership.
 *
 * Derived, never hand-listed — a hand-listed copy is one more thing to forget
 * when an audience goes live. Order follows LIVE_AUDIENCES so the switcher
 * reads the same everywhere.
 */
export function landingAudiences(): Audience[] {
  return LIVE_AUDIENCES.filter((a) => a.landing);
}

export const LIVE_AUDIENCES: Audience[] = [
  AUDIENCES.student,
  AUDIENCES.professional,
  AUDIENCES.owner,
];

/**
 * Read an audience out of a query string, a database column, or anything else
 * untrusted.
 *
 * Returns the default rather than throwing, and deliberately will NOT resolve
 * a planned audience from a query string — `?for=school` today would render a
 * headline with an empty benefits list, which reads as a broken page rather
 * than as "not yet".
 */
export function audienceFromParam(raw: string | null | undefined): AudienceId {
  if (!raw) return DEFAULT_AUDIENCE;
  const key = raw.trim().toLowerCase();
  const found = (Object.keys(AUDIENCES) as AudienceId[]).find((id) => id === key);
  if (!found) return DEFAULT_AUDIENCE;
  if (AUDIENCES[found].status !== "live") return DEFAULT_AUDIENCE;
  return found;
}

/**
 * Same parse, but for values already stored on a member row — where a planned
 * audience IS legitimate (an admin can set one before it launches publicly)
 * and an unknown value should stay unknown rather than silently becoming the
 * default audience and getting the wrong lifecycle emails.
 */
export function storedAudience(raw: string | null | undefined): AudienceId | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return (Object.keys(AUDIENCES) as AudienceId[]).find((id) => id === key) ?? null;
}

export function audience(id: AudienceId): Audience {
  return AUDIENCES[id];
}
