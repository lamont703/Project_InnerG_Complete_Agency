/**
 * Copy for the booth rental agreement guide, kept out of the page so the
 * clause list can be tested and counted without rendering JSX.
 *
 * WHAT THIS DELIBERATELY IS NOT: a fill-in-the-blank contract. The main
 * competitor promises "a booth rental template" and never delivers one, and the
 * temptation is to win by shipping the file they didn't. A downloadable
 * agreement is a legal instrument — it varies by state, it decides what happens
 * when somebody loses their income, and getting it wrong costs a real person
 * real money.
 *
 * A CHECKLIST IS BOTH SAFER AND MORE USEFUL. Somebody who walks into a lawyer's
 * office knowing the twelve things their agreement has to settle gets a better
 * contract, faster and cheaper, than somebody who downloaded a PDF written for
 * another state.
 */

export interface Clause {
  n: number;
  title: string;
  /** What the agreement should actually say. */
  says: string;
  /** What goes wrong when it is vague or missing. */
  breaks: string;
}

export const CLAUSES: Clause[] = [
  {
    n: 1,
    title: "Who is renting, and what exactly",
    says: "Both legal names, the licence number of each party, and the specific station, chair or suite — by number, not 'a chair'.",
    breaks: "Two people remember a different chair. It sounds trivial until the shop fills up and somebody is moved next to the door.",
  },
  {
    n: 2,
    title: "Rent, and when it is due",
    says: "The amount, the day of the week it is due, and the method. Booth rent is paid weekly in most of this industry, so say which day — not 'monthly' or 'the first'.",
    breaks: "The single most common dispute. 'Due Monday' and 'due by the end of the week' are the same sentence to two different people.",
  },
  {
    n: 3,
    title: "What happens when rent is late",
    says: "The grace period in days, the late fee, and what happens if it keeps happening. Write the sequence: late once, late repeatedly, and the point at which the arrangement ends.",
    breaks: "Almost nobody writes this properly, and it is the clause that decides whether a bad month becomes a bad year. See the section below.",
  },
  {
    n: 4,
    title: "Deposit, and how it comes back",
    says: "The amount, what it may be deducted for, and the number of days after leaving that it is returned.",
    breaks: "A deposit with no stated return date is a deposit somebody has to chase, and often does not get.",
  },
  {
    n: 5,
    title: "How long, and how either side ends it",
    says: "The term, whether it renews automatically, and the notice each side must give. Notice should usually be the same both ways.",
    breaks: "One-sided notice — thirty days from the renter, none from the shop — is common and reads as normal until it is used.",
  },
  {
    n: 6,
    title: "What the rent includes",
    says: "Utilities, wifi, reception, laundry, back-bar product, parking, cleaning. List what is included AND what is not.",
    breaks: "Everything unlisted becomes an argument later, usually about water and towels.",
  },
  {
    n: 7,
    title: "Hours and access",
    says: "When the renter may be in the building, whether they hold a key, and whether they may work outside the shop's posted hours.",
    breaks: "A booth renter is running their own business. A contract that dictates their hours too closely can undermine that status — see the tax note below.",
  },
  {
    n: 8,
    title: "Licences and compliance",
    says: "That both parties hold and maintain current licences, that the renter's licence is displayed as their state requires, and who is responsible for the establishment licence.",
    breaks: "An expired licence in a shop is usually the SHOP's exposure as well as the renter's. Requirements differ by state — see below.",
  },
  {
    n: 9,
    title: "Insurance",
    says: "Who carries liability cover, at what limit, and whether the renter must name the shop on their policy.",
    breaks: "Both sides assume the other has it. Neither does.",
  },
  {
    n: 10,
    title: "Clients, records and who they belong to",
    says: "That the renter's clients are the renter's, that they may take their client list when they leave, and what happens to booking data held on the shop's system.",
    breaks: "The most expensive fight in this industry, and it is decided by whatever the contract says — or by nothing at all.",
  },
  {
    n: 11,
    title: "Products and retail",
    says: "Whether the renter may sell retail, on what split, and whether they must use the shop's back-bar line.",
    breaks: "A vague split is a monthly disagreement.",
  },
  {
    n: 12,
    title: "Non-compete, if any",
    says: "If there is one: how far, for how long, and exactly what it prevents. Many are unenforceable as written, and enforceability varies sharply by state.",
    breaks: "A clause nobody can enforce still frightens people out of leaving, which is often the actual point.",
  },
];

export const FAQ = [
  {
    q: "Do I legally need a written booth rental agreement?",
    a: "A verbal arrangement can be a contract, but it is a contract nobody can prove the terms of. Every state regulator treats a booth renter as an independent business rather than an employee, and the written agreement is the main evidence that this is what the arrangement actually is. Put it in writing even between friends — especially between friends.",
  },
  {
    q: "Is a booth renter an employee or an independent contractor?",
    a: "A booth renter is running their own business — their own clients, their own hours, their own prices. That status is not decided by what the contract calls somebody, it is decided by how the arrangement actually works, and a contract that controls a renter's hours, pricing and methods can undermine it regardless of the label at the top. This has tax consequences for both sides.",
  },
  {
    q: "How much should booth rent be?",
    a: "It depends on the market, and most published figures are guesses. What we can tell you is what Houston shops reported to us directly: a median of $180 a week, ranging from $50 to $300, across 33 shops. Treat that as one metro, not a national number — anyone quoting a single national average is estimating.",
  },
  {
    q: "Can I use a template I found online?",
    a: "As a starting point for the conversation, yes. As the document you both sign, no — licensing obligations, notice requirements and non-compete enforceability all vary by state, and a template written for another state can be confidently wrong. Take a checklist to a lawyer rather than a PDF to a printer.",
  },
  {
    q: "What should the agreement say about late rent?",
    a: "More than most of them do. State the grace period in days, the late fee, and the escalation — what happens the first time, what happens when it repeats, and the point at which the arrangement ends. Vague language here is what turns one bad week into months of chasing.",
  },
  {
    q: "Who owns the clients?",
    a: "Whoever the agreement says. If it says nothing, expect a fight when somebody leaves. In a booth rental arrangement the renter's clients are normally the renter's, but that is worth stating explicitly, along with what happens to contact details held in the shop's booking software.",
  },
];
