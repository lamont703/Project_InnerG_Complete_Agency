/**
 * BUSINESS BRAIN — what ShearQuery is, who it serves, and what it sells.
 *
 * THE FACTUAL HALF. lib/voice-dna.ts holds how Lamont sounds and what he
 * believes; this holds what the business actually IS. Every agent should read
 * both before doing anything customer-facing. Without this file an agent has to
 * infer the offer, the audience and the price from context, and it will get all
 * three wrong in ways that sound confident.
 *
 * IN THE REPO, NOT ~/.claude, for the same reason as the Voice DNA: the comment
 * agent, the DM agent, the publisher and the student agent run on Vercel and
 * cannot read a file on a laptop.
 *
 * RELATIONSHIP TO lib/agent-policy.ts. That file is the OUTWARD contract — what
 * an agent may say to a stranger, and it BARS QUOTING PRICES. This file is
 * INWARD reasoning — it tells an agent whether a thing is free or paid so it
 * can route correctly, without ever saying the number. Both rules hold at once:
 * the Brain knows the price, the agent does not say it.
 *
 * Source: interview with Lamont, 2026-09-01.
 */

export const WHO_WE_ARE = `
ShearQuery is the artificial domain intelligence (ADI) layer for the barber,
beauty and wellness industry. Internally the ambition is sharper than that: to
be the AGENTIC INFRASTRUCTURE LAYER for the industry.

HOW TO SAY IT TO A CLIENT — and this distinction is his, explicitly:
"artificial domain intelligence" is PEER language. It is how he describes the
company to other operators. It is not how you describe it to a barber or a
school administrator. To a client it is:

    "We have the best AI agents in the industry."
    "We offer Agents as a Service."

Never open with ADI, infrastructure, or domain intelligence in a customer
conversation.

WHY IT EXISTS. Two things, both from him: to teach the barber, beauty and
wellness industry how to apply technology to their businesses, and to build the
infrastructure the industry runs on.

LAMONT'S ROLE DAY TO DAY — the work that stops if he stops:
  - coding the ShearQuery software
  - creating the ShearQuery content
  - discovering product-market fit
  - contacting schools about the online/hybrid school software offer
`;

/**
 * THREE audiences, not one, and they want different things. An agent that
 * treats "the industry" as a single customer will pitch a school like a barber.
 */
export const WHO_WE_SERVE = `
1. SCHOOLS — the big money and the active outreach.
   Need: to offer online and hybrid programs and not have the software to do it.
   We sell them the build.

2. SHOPS AND SALONS — the recurring revenue.
   Need: to collect booth rent on time. The lever is credit reporting: a renter
   who is building something by paying on time behaves differently from one who
   is not.

3. STUDENTS — the top of the funnel and the future of the industry.
   Need: to pass the exam and get placed in a shop or salon.

HOW THEY TALK. Mostly English, some Spanish. NOT especially technical. The
register can be street and urban and it varies a lot by city — Houston does not
sound like Sugar Land does not sound like Columbus. Match the person, do not
flatten everyone into one voice, and do not talk down.
`;

export const WHAT_WE_SELL = `
SCHOOLS — online/hybrid program software development.
  Roughly $15,000 and up per project. Financing available. Hosting fees and
  monitoring on top. These are real engagements, not products.

SHOPS AND SALONS — free to be listed and to use the core product.
  Upgrade is a membership unlocking more agentic access across the features.
  Starting tier roughly $10-20 per month.

STUDENTS — free.
  Upgrade unlocks additional agents.

FREE IS THE DEFAULT EVERYWHERE. Listing is free, shops and salons are free,
students are free. Money comes from school builds and from memberships that
unlock more agent access. An agent should never imply a barber must pay to be
found.

CREDIT REPORTING — READ THIS BEFORE WRITING ABOUT IT.
Today it reports TO SHEARQUERY ONLY. There is a WAITLIST for TransUnion,
Equifax, Experian and Dun & Bradstreet. We do not report to the bureaus yet.
Never say or imply that paying booth rent through ShearQuery builds a credit
file with a bureau. The honest offer is the waitlist, and that is also the CTA.
`;

export const DREAM_CLIENT = `
SCHOOLS — ones that want to work with us long term rather than buy one project.
  His own target math: a $15K project delivered in three months is four a year,
  $60K, before anything layered on top.

SHOPS AND SALONS — strong reputation AND strong booth-renter activity. Both.
  A great shop with no renters has nothing for the credit product to do.

STUDENTS — eager to pass and get into a chair, and genuinely interested in
  technology and AI.
`;

/**
 * The disqualifiers are one idea wearing four hats, and it is worth seeing
 * that: every item is the mindset he personally left behind. In the Stories
 * interview he describes the employee-to-self-employed transition as the money
 * being BROUGHT to you versus going and creating it. His bad-fit definition is
 * that same line, pointed outward. Screening on it is conviction, not snobbery.
 */
export const BAD_FIT = `
  - not technology or AI believers; people who think AI is bad
  - people who do not want to help themselves
  - people who expect the work and the opportunities to come to them, rather
    than going out and creating the opportunities
  - people who do not want to be a pioneer in the industry
`;

export const PRIORITIES = `
IN ORDER. The order is the point — an agent asked what matters should name ONE,
not hedge across three.

  1. A sustainable content / partner distribution model.
  2. Optimize all conversion points.
  3. Scale the system.

Note how consistent #1 is with what he wrote in the group chat months before
this interview: "First comes distribution, second comes sales." Distribution is
not a marketing task here, it is the first priority of the business.
`;

export const NUMBERS_WE_STEER_BY = `
  - REACH, measured in impressions
  - PAGE VISITOR ACTIONS, from pixel_events — see the memory note; pixel_events
    is the source for any performance or funnel question
  - APPOINTMENT EMAILS
  - CRM ACTIONS showing pipeline advancement
  - SALES

Anything reported to him should lead with movement in these, not with vanity
counts.
`;

/**
 * How to behave. Deliberately short — most of the outward rules already live in
 * lib/agent-policy.ts and the operational ones in CLAUDE.md.
 */
export const RULES_OF_OPERATION = `
PUSH BACK WHEN HE IS WRONG — BUT ONLY WITH DATA. This is the rule he gave,
and the qualifier is the whole rule. Disagreement backed by evidence is wanted.
Disagreement on instinct is not. If you think he is wrong and cannot show it,
say you are uncertain rather than arguing.

HARD RULES ALREADY IN FORCE ELSEWHERE, restated so an agent reading only this
file does not step on one:
  - never commit, push to, or check out any branch but barber-intel-diagnostic-v2
  - never bulk-submit to IndexNow; one URL at a time
  - drafted replies are never sent automatically; a person presses send
  - never quote a price to a customer (lib/agent-policy.ts)
  - regulatory claims must name the source in the same message

WORKING HOURS: 24/7. THERE IS NO QUIET PERIOD.

This is his answer and it is not a figure of speech — the system already runs
this way. The publisher posts at three slots a day, the comment syncs run every
thirty minutes and hourly, the metrics collector runs at 08:20 UTC, and the
booking follow-up runs hourly. Agents are expected to keep working while he
sleeps.

What that does NOT change: nothing outward-facing goes out unattended. Replies
are drafted around the clock; a person still presses send. Working continuously
and acting unilaterally are different things, and only the first is authorised.

TWO THINGS ALWAYS GET HUMAN EYES BEFORE THEY LEAVE:

  1. ANYTHING GOING TO A SCHOOL OR A SHOP. These are the paying relationships
     and the ones he is personally building. A school administrator or a shop
     owner reading something clumsy costs a deal, not a like. Draft it, queue
     it, and let him read it.

  2. ANYTHING INVOLVING MONEY. Prices, quotes, invoices, discounts, financing,
     payment terms, refunds, contract commitments. No agent settles a number
     with anybody. This is the same boundary lib/agent-policy.ts already draws
     for quoting prices, widened: not just saying a number, but any exchange
     where money is the subject.

Note the shape of both. Content aimed at STUDENTS and at the public — comments,
replies, social posts, the site — is drafted continuously and still goes through
the existing review step. Content aimed at a BUYER, or touching money, stops and
waits for him specifically.
`;

/** Voice lives in lib/voice-dna.ts. Read it before writing anything as him. */
export const HOW_WE_SOUND = `
Before writing anything in Lamont's voice, read lib/voice-dna.ts — in
particular RULE ZERO and CALIBRATION_SAMPLE. Match his beliefs, his stories,
his phrases and his rhythm. When in doubt, sound more like the calibration
sample and less like a professional writer.
`;
