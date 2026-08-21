/**
 * What the Instagram DM agent is allowed to do, and when.
 *
 * Pure. `now` is always a parameter and nothing here sends, stores or reads
 * anything — the same split lib/booking-escalation.ts keeps, and for the same
 * reason: these thresholds decide what a stranger receives on a public channel,
 * and they need to be testable without a message going anywhere.
 */

/**
 * Free questions per day for someone who has not linked an account.
 *
 * Three, not one and not ten. The median chat session on the website is a
 * SINGLE message and only 16 of 197 sessions ever reached two model replies —
 * so three covers almost everyone who is genuinely curious, and the people it
 * stops are the ones worth converting rather than the ones worth serving.
 */
export const FREE_PER_DAY = 3;

/** Matches the website's member allowance, because it is the same brain. */
export const MEMBER_PER_DAY = 50;

/**
 * A thread this quiet has to be told again that it is talking to a bot.
 *
 * Meta requires disclosure "at the beginning of any conversation or message
 * thread, after a significant lapse of time, or when a chat moves from human
 * interaction to automated experience". "Significant lapse" is not defined, so
 * this picks a number and writes down that it picked one: thirty days is long
 * enough that a person has forgotten the thread and short enough that they have
 * not forgotten the account.
 */
export const REDISCLOSE_AFTER_DAYS = 30;

/**
 * User messages before the membership offer is made.
 *
 * Three, so it lands only after someone has actually got value twice. Offering
 * on message one is a toll gate on a promise the bio just made, and it is the
 * fastest way to make an account look like a funnel rather than a service.
 */
export const OFFER_AFTER_EXCHANGES = 3;

export interface DmThreadState {
  memberId: string | null;
  disclosedAt: string | null;
  usageDay: string | null;
  messagesToday: number;
  exchanges: number;
  offeredMembershipAt: string | null;
  lastMessageAt: string | null;
}

/** UTC day key. The reset boundary is arbitrary; being consistent is not. */
export function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function needsDisclosure(t: DmThreadState, now: Date): boolean {
  if (!t.disclosedAt) return true;
  const gapDays = (now.getTime() - new Date(t.disclosedAt).getTime()) / 86_400_000;
  return gapDays >= REDISCLOSE_AFTER_DAYS;
}

export interface RateState {
  allowed: boolean;
  limit: number;
  /** Counts THIS message. Zero means the one being handled is the last free one. */
  remaining: number;
  /** True when the day rolled over and the stored counter is stale. */
  resets: boolean;
}

export function rateState(t: DmThreadState, now: Date): RateState {
  const limit = t.memberId ? MEMBER_PER_DAY : FREE_PER_DAY;
  const resets = t.usageDay !== dayKey(now);
  const used = resets ? 0 : t.messagesToday;
  return {
    allowed: used < limit,
    limit,
    remaining: Math.max(0, limit - used - 1),
    resets,
  };
}

/**
 * Whether this turn should carry the membership offer.
 *
 * Once, ever — a second ask reads as a funnel, and there is no way to mute just
 * the pitch in a one-to-one thread. Never to someone already linked, and never
 * before they have had real value, which is what OFFER_AFTER_EXCHANGES buys.
 */
export function shouldOfferMembership(t: DmThreadState): boolean {
  if (t.memberId) return false;
  if (t.offeredMembershipAt) return false;
  return t.exchanges + 1 >= OFFER_AFTER_EXCHANGES;
}

/**
 * Is this message the person answering the offer with their email?
 *
 * Deliberately strict: the whole message must be an address, give or take
 * surrounding whitespace. Extracting an address from the middle of a sentence
 * would catch someone quoting a shop's contact email or asking a question that
 * happens to contain one, and creating an account for a third party off the
 * back of that is not recoverable by apologising.
 *
 * Not a validator. It decides intent; whether the mailbox exists is settled by
 * whether the magic link ever gets clicked.
 */
export function isBareEmail(text: string): string | null {
  const t = (text || "").trim();
  const m = /^[^\s@<>()[\],;:]+@[^\s@.]+(\.[^\s@.]+)+$/.exec(t);
  return m ? t.toLowerCase() : null;
}

/**
 * Meta's required disclosure, in the account's voice rather than boilerplate.
 *
 * IT IS NAMED "THE SHEARQUERY AGENT" AND IT STILL SAYS "BOT". Those are two
 * different jobs and only one of them is optional. The name is branding; the
 * word "bot" is the disclosure, and Meta's own two examples of an acceptable
 * one — "I'm the [Page Name] bot" and "You are talking to a bot" — both use it.
 *
 * "Agent" cannot carry that weight on its own, and swapping it in would make
 * this worse rather than shorter: in any service context an agent is a PERSON
 * ("an agent will be with you shortly"), so the word people read as proof of a
 * human would be doing the work of telling them there isn't one. That is the
 * opposite of a disclosure.
 *
 * Not a style preference. The disclosure is a legal requirement for California
 * and German users, and California is a market this site is actively entering.
 */
export const DISCLOSURE =
  "Heads up — you're talking to the ShearQuery Agent, an automated bot rather than a person. I know Texas and California barber & beauty data: shops, salons, schools, licences.";

/**
 * The one-time offer.
 *
 * IT ASKS FOR THE EMAIL IN THE THREAD rather than linking out. A link is an app
 * switch, and the entire premise of this channel is that nobody has to leave
 * Instagram. It also names what an account actually changes — the journey layer
 * — because "sign up for more" is a request, while "I'll remember your state
 * and exam date" is an offer.
 */
export const MEMBERSHIP_OFFER =
  "Want me to remember your situation — state, licence track, exam date — so answers get specific to you instead of general? Reply with your email and I'll set up a free account right here. No password, no forms.";

/** What they get told when the day's free questions are gone. */
export function limitMessage(t: DmThreadState): string {
  return t.memberId
    ? `That's your ${MEMBER_PER_DAY} for today — resets tomorrow.`
    : `That's your ${FREE_PER_DAY} free answers for today. Reply with your email and I'll set up a free account — ${MEMBER_PER_DAY} a day, and I'll remember your state and licence track so the answers stop being generic.`;
}
