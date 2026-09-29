import { COMMISSION_HOLD_DAYS, COMMISSION_RATE, MIN_PAYOUT_CENTS } from "@/lib/plans";

/**
 * THE AGENCY PARTNER AGREEMENT — what an agency accepts before ShearQuery
 * approves it.
 *
 * Written 2026-09-29 from the terms the product owner decided (the 25% rate,
 * the 30-day hold, the $50 minimum, first-agency-wins credit, read-only
 * support access), with the company details, governing law, notice period
 * and liability cap they supplied. Made FINAL as version 1.0 on 2026-09-29 at
 * the owner's instruction.
 *
 * CHANGING IT: edit the text, bump `version`. Every agency is then asked to
 * accept the new version, and approval requires it. A draft ("draft", or any
 * [BRACKETED] blank left) can be read but not accepted.
 *
 * The numbers come from lib/plans.ts, so the agreement can never quote a rate,
 * hold or minimum the code doesn't apply.
 */

export const PARTNER_AGREEMENT = {
  version: "1.0",
  status: "final" as "draft" | "final",
  title: "ShearQuery Partner Agreement",
};

const pct = `${Math.round(COMMISSION_RATE * 100)}%`;
const min = `$${MIN_PAYOUT_CENTS / 100}`;

export const AGREEMENT_SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. Who this agreement is between",
    body: [
      `This agreement is between Inner G Complete Agency, which operates ShearQuery ("ShearQuery", "we"), and the agency accepting it ("you", "the Partner"). You accept it by selecting "I agree" on your ShearQuery agency page. It takes effect when ShearQuery approves your agency.`,
    ],
  },
  {
    title: "2. What you're agreeing to do",
    body: [
      "You introduce barbers, stylists, shops, salons, schools and supply stores to ShearQuery. In return you earn commission on what the businesses you bring in pay us, as set out below.",
      "You're an independent business, not our employee, agent, partner or joint venturer. You can't make promises, sign anything or accept payment on ShearQuery's behalf.",
    ],
  },
  {
    title: "3. Approval",
    body: [
      "ShearQuery reviews each agency and may approve or decline it at our discretion. Nothing is credited to you before approval.",
    ],
  },
  {
    title: "4. How a business is credited to you",
    body: [
      "A business is credited to you when it creates its ShearQuery account through your referral link, types your referral code at signup, or accepts an email invite you sent through ShearQuery.",
      "Credit is fixed when the business signs up. Each business can be credited to only one agency, and the first valid referral wins; it can't be moved to another agency later. If a signup carries more than one referral, an invite counts first, then a typed code, then a link.",
      "You can't be credited for your own account, another agency's account, or the sample clients shown on your agency page.",
    ],
  },
  {
    title: "5. Commission",
    body: [
      `You earn ${pct} of what each business credited to you actually pays ShearQuery for its subscription plan, for as long as it stays on a paid plan while this agreement is in effect.`,
      "Commission is calculated on the amount we actually receive, after any discounts and excluding taxes. Where a payment is refunded, the commission on it is reduced to match.",
      `ShearQuery may change the commission rate. A new rate applies only to payments made after it takes effect, and we'll give you at least 30 days' written notice first. Commission already earned stays at the rate it was earned at.`,
    ],
  },
  {
    title: "6. When and how you're paid",
    body: [
      `Commission on a payment becomes payable ${COMMISSION_HOLD_DAYS} days after we receive that payment, so a refund in that time simply lowers it.`,
      `We pay out once at least ${min} is payable, normally monthly, through Stripe to the payout account you set up on Stripe's pages (or by another method we agree with you). Below ${min}, the balance carries forward.`,
      "If a payment is refunded after its commission has been paid to you, we take that amount off your next payout.",
      "You can see your earnings, what's payable, and every payout on your ShearQuery agency page.",
    ],
  },
  {
    title: "7. Taxes",
    body: [
      "You're responsible for your own taxes on commission. You'll give accurate tax information through Stripe's pages when you set up payouts. Where the law requires it, we'll issue you a Form 1099.",
    ],
  },
  {
    title: "8. How you represent ShearQuery",
    body: [
      "Be accurate. Describe ShearQuery's features, prices and plans as they are, including saying plainly when a feature is still in testing. Don't promise results, rankings, prices or discounts we don't offer.",
      "Don't pretend to be ShearQuery or imply you speak for us. Use our name and logo only to describe ShearQuery truthfully.",
      "Follow the law when you market, including anti-spam and texting rules: contact businesses only in ways they've allowed.",
      "Don't create accounts for businesses without their knowledge, pay or reward businesses just to sign up, or refer yourself or people acting for you.",
    ],
  },
  {
    title: "9. Clients' information",
    body: [
      "A business can choose to let you see its account's health on ShearQuery. You may use what you see only to help that business, must keep it confidential, and must stop using it when the business switches sharing off or this agreement ends.",
    ],
  },
  {
    title: "10. Fraud and misuse",
    body: [
      "If we reasonably believe a referral was fraudulent, self-dealing or obtained against this agreement, we may withhold or reverse the commission on it and suspend your account while we look into it.",
    ],
  },
  {
    title: "11. Ending this agreement",
    body: [
      "Either of us can end this agreement at any time by written notice, including by email.",
      "When it ends, commission on payments we received before the end date is still paid on the normal schedule. No commission is earned on payments received after it ends. If we end it because you broke this agreement, we don't owe commission that hadn't yet been paid.",
    ],
  },
  {
    title: "12. Changes to this agreement",
    body: [
      "We may update this agreement. We'll tell you before a change takes effect and ask you to accept the new version on your agency page. If you don't accept it, either of us can end the agreement under section 11.",
    ],
  },
  {
    title: "13. No guarantees, and limits",
    body: [
      "We don't guarantee any amount of referrals, signups or commission. ShearQuery is provided as it is, and we may change or stop features.",
      "To the extent the law allows, neither of us is liable to the other for indirect or consequential losses, and ShearQuery's total liability under this agreement is limited to the commission paid or payable to you in the 12 months before the claim.",
    ],
  },
  {
    title: "14. General",
    body: [
      "This agreement is governed by the laws of the State of Georgia, and any dispute will be handled in the courts of Fulton County, Georgia.",
      "It is the whole agreement between us about the partner program. If a part of it can't be enforced, the rest still applies. Notices to ShearQuery go to legal@innergcomplete.com; notices to you go to your agency account's email.",
    ],
  },
];

/** Blanks still to fill before the agreement can be made final. */
export function unfilledBlanks(): string[] {
  const text = AGREEMENT_SECTIONS.flatMap((s) => s.body).join(" ");
  return [...new Set(text.match(/\[[A-Z0-9 ,]+\]/g) || [])];
}

export const agreementIsFinal = () => PARTNER_AGREEMENT.status === "final" && unfilledBlanks().length === 0;
