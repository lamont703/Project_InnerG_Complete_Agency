import { AUDIENCES, type AudienceId } from "@/lib/audiences";
import { COMMISSION_HOLD_DAYS, COMMISSION_RATE, FREE_PUBLISHES_PER_MONTH, MIN_PAYOUT_CENTS, PRICES } from "@/lib/plans";

/**
 * THE AGENCY PLAYBOOK — how the partner program is meant to be worked, for
 * agencies to read and for Claude to answer from (agency_playbook tool,
 * /account/agency/playbook). Without it, Claude improvises the method, the
 * pitch and the rules in its own words.
 *
 * FIRST DRAFT, 2026-09-29, for the product owner to edit. Written from what
 * he decided in the build (prices, commission, credit, outreach, consent,
 * support access), as plain guidance from ShearQuery — deliberately NOT in
 * his first person: lib/voice-dna.ts says to write from his recorded stories,
 * and none is about agencies. OWNER_NOTE is the place for one.
 *
 * Items marked SUGGESTED are my defaults, not his decisions — review them.
 * Every price and commission figure is computed from lib/plans.ts, so the
 * playbook can't quote a number checkout or the ledger doesn't use.
 */

/** A short note from the owner, in his own words — empty until he writes one. */
export const OWNER_NOTE: string | null = null;

const pct = Math.round(COMMISSION_RATE * 100);
const money = (dollars: number) => `$${dollars.toFixed(2).replace(/\.00$/, "")}`;
const monthly = (type: AudienceId, plan: "manage" | "autopilot") => PRICES[type]![plan] * COMMISSION_RATE;

export interface PlaybookSection {
  id: string;
  title: string;
  body: string[];
}

export function playbookSections(): PlaybookSection[] {
  const shop = PRICES.barbershop!;
  const tenShops = 10 * monthly("barbershop", "manage");
  return [
    {
      id: "overview",
      title: "How the partner program works",
      body: [
        "You bring barbers, stylists, barbershops, salons, schools and supply stores onto ShearQuery, and you earn commission on what those businesses pay us for their plan, every month they stay on a paid plan.",
        "A business is credited to you when it joins through your referral link, types your referral code at signup, accepts an email invite you sent, or signs up from an audit page you shared. Credit is fixed at signup and the first agency to get a business signed up keeps it for good, so the business you bring in stays yours.",
        "Everything you need is in your Claude. Ask what to do next at any time and it'll tell you, based on where you are.",
      ],
    },
    {
      id: "workflow",
      title: "The workflow, step by step",
      body: [
        "1. Find businesses to pitch. Ask Claude something like \"find Houston barbershops that need help with Google\" (find_prospects). You'll get a ranked list of businesses that aren't on ShearQuery yet, each with the reason they could use help, their phone and website, and the date our data is from.",
        "2. Look at one closely. Ask Claude to tell you about a business (prospect_details). You'll get its Google profile check from our data, written up as talking points.",
        "3. Send the business its own audit page. Ask for an audit link (share_audit_link) and send it from your own email, DMs, or in person. The page shows the business its own score and what to fix, says it was shared by you, and has a button to get started free, which credits the business to you.",
        "4. Follow up. Your pipeline (my_prospects) shows who opened their audit and who asked for a free profile review. A business that asked for a review has agreed to be contacted, so follow those up first.",
        "4b. Invite them to the Monday LIVE training. ShearQuery runs a free LIVE AI Barber Beauty Business Training every Monday at 3 PM ET. Share it with your own link (promote_live_training): everyone who registers through it is recorded as yours, and if they create a ShearQuery account later they're credited to you. It's the easiest first yes — a free hour, no camera needed.",
        "5. Invite the business once it's ready. When a business says yes, send the invite from Claude (invite_client_to_shearquery), or they can use the audit page or your link. Either way they're credited to you.",
        "6. Help your clients succeed. Your client list (my_agency) shows every business you brought in and where each one is up to. If a client shares their account with you, you can see exactly what's stuck (client_support_view) and help them fix it. A client that's getting results is a client that stays, and that's what keeps your commission coming in.",
      ],
    },
    {
      id: "commission",
      title: "How your commission adds up",
      body: [
        `You earn ${pct}% of what each business you brought in actually pays us, every month it stays on a paid plan. A business on the Free plan pays nothing, so it doesn't earn commission until it upgrades.`,
        `Here's what one business earns you each month: a barbershop or salon on Manage (${money(shop.manage)}) earns you ${money(monthly("barbershop", "manage"))}, and on Autopilot (${money(shop.autopilot)}) earns you ${money(monthly("barbershop", "autopilot"))}. A barber or stylist on Manage earns you ${money(monthly("barber", "manage"))}. A school on Autopilot earns you ${money(monthly("school", "autopilot"))}. A supply store on Manage earns you ${money(monthly("supply_store", "manage"))}.`,
        `So ten barbershops on Manage bring you ${money(tenShops)} a month, and that keeps coming every month they stay, which is why helping your clients get results matters as much as signing them up.`,
        `Commission on each payment becomes payable ${COMMISSION_HOLD_DAYS} days after we receive it, so a refund in that time just lowers it. We pay out through Stripe once at least ${money(MIN_PAYOUT_CENTS / 100)} is ready, straight to the bank account you set up on Stripe's page. Your earnings, what's waiting, and every payout are on your agency page and in Claude (my_agency).`,
        "The full terms are in the partner agreement on your agency page. The rate can change, and if it does it only applies to payments after the change, with notice first.",
      ],
    },
    {
      id: "pitch",
      title: "What to tell each kind of business",
      body: [
        "Lead with what their own audit found. A business pays attention when it sees its own listing, so start from the audit page's findings rather than a general pitch.",
        `Barbershops and salons: ShearQuery lets the owner run their Google profile from Claude or the website, so they can see the full audit, fix what's missing, reply to reviews and post updates. Free includes the audit, drafts of every fix and ${FREE_PUBLISHES_PER_MONTH} publishes a month. Manage publishes without a limit. Autopilot replies to their 4 and 5 star reviews in their voice, writes a Google post each week that they see a day before it goes out, and sends them a Monday report.`,
        "Barbers and stylists: their own verified profile in the directory, and if they have their own Google profile, which booth renters often do, the same Google tools as a shop.",
        "Schools: tour requests from students comparing schools, their exam pass rates shown next to the state's, and the same Google tools.",
        "Supply stores: their listing and the Google tools.",
        "Using ShearQuery inside Claude needs the owner's own Claude subscription, about $20 a month paid to Anthropic, but everything also works on the website without it.",
        "When the appointment book opens, Manage also lets a barber's clients book them from their own AI — Claude or ChatGPT — with a free client account, or from the barber's booking page and QR code with no account at all. That's a strong reason for a busy barber to pay for Manage.",
        "Say it plainly when something is still in testing. Right now that's the appointment book (and with it, clients booking through their AI) and Instagram insights. Claude's what_shearquery_does always has the current status.",
      ],
    },
    {
      id: "never",
      title: "What never to promise",
      body: [
        "Never promise rankings, more customers, or a revenue number. We can show a business what's missing and help them fix it, but nobody controls what Google does.",
        "Never sell a feature that's still in testing as available.",
        "Never quote a price or a discount that isn't on shearquery.com/pricing.",
        "Never say ShearQuery is part of Google, or that you can manage a client's account for them. Right now you can see a client's account health read-only, and only when they share it with you.",
        "Never create an account for a business, or sign one up without them knowing.",
      ],
    },
    {
      id: "outreach",
      title: "How to reach out, and why it matters",
      body: [
        "Reach out from your own email, phone and DMs, not ShearQuery's. ShearQuery doesn't send outreach for you, and that's on purpose: our text number is registered for our own booking texts, and if it were used for cold messages it could be shut down for every business that relies on it.",
        "Follow the rules for your own outreach too. Texting business owners who haven't agreed to hear from you can break texting laws, because most shop numbers are cell phones. Cold email is generally allowed for businesses as long as you say who you are, include a way to opt out, and stop when asked. The partner agreement makes this your responsibility, so if you're unsure, ask your own advisor.",
        "The audit page is the safe handoff. You send a business its own results from your channels, and if they want help they ask for a review on the page. That request records their permission to be contacted, and the exact wording they agreed to.",
        "SUGGESTED follow-up rhythm: if a business opened its audit but didn't reply, follow up once after three to five days. If there's still nothing after a second follow-up, or they ask you to stop, move them to Not interested and move on.",
      ],
    },
    {
      id: "priorities",
      title: "Where to spend your time",
      body: [
        "First, anyone who asked for a profile review. They raised their hand, so reach out the same day.",
        "Next, anyone who opened their audit page more than once. They're thinking about it.",
        "Then new prospects near you with the clearest need: few reviews for their city, a low rating, or reviews that have stalled. Shops with open booths are growing and spending, so they're worth a look too.",
        "And keep an eye on your existing clients. One that's stuck on its Google connection or has drafts waiting won't see results, and a client that doesn't see results won't stay on a paid plan.",
      ],
    },
    {
      id: "faq",
      title: "Questions agencies ask",
      body: [
        "What if another agency pitched the same business? There are no reservations. The business is credited to whichever agency gets it signed up first, so saving a prospect doesn't hold it for you.",
        "What if a client cancels? Your commission stops when their payments stop. Commission you already earned on payments we received is still yours on the normal schedule.",
        "Can I try it before I pitch it? Yes. Ask Claude to show ShearQuery as a barbershop, salon, school or supply store (start_demo). It runs the real tools on a made-up business, and nothing reaches Google or any customer.",
        "Do my clients need Claude? No. It's optional, and everything works on the website.",
        `Who's always free? Students, clients booking an appointment, and agencies. ${AUDIENCES.barbershop.label}s, salons, barbers, stylists, schools and supply stores start free and choose whether to upgrade.`,
        "Can I see my clients' accounts? Only when a client switches on sharing with you, and only read-only. You can ask them from Claude (request_client_access), and they decide.",
      ],
    },
  ];
}

export const PLAYBOOK_TOPICS = ["overview", "workflow", "commission", "pitch", "never", "outreach", "priorities", "faq"] as const;
