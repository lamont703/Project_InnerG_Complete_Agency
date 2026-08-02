/**
 * Deciding which member hears from us, and about what.
 *
 * The judgement, not the plumbing, is what matters here — so it's pure and
 * tested. Everything this module decides ends in an email to a real person who
 * runs a shop, and the failure mode is not "we missed one". It's mailing
 * someone four times in a week because they crossed four thresholds at once,
 * which costs you the relationship and the address.
 *
 * FOUR RULES, and each exists because the alternative is worse:
 *
 *  1. ONE STAGE EVER. A member receives each stage at most once, for the life
 *     of the account. There is no re-send, no "reminder", no second attempt.
 *     If a message didn't work, sending it again works less.
 *  2. ONE EMAIL AT A TIME. However many stages a member qualifies for, exactly
 *     one is chosen per run — the furthest along, because that's the most
 *     useful thing we could say.
 *  3. A QUIET PERIOD BETWEEN STAGES. Crossing two thresholds in a week must not
 *     produce two emails in a week.
 *  4. THE SEQUENCE ENDS. After the dormant check-in there is nothing further.
 *     A member who ignored everything is not a lead to be worked harder.
 *
 * Pure — no network, no database.
 */

export type LifecycleStage =
  | "no_claim"
  | "claimed_not_connected"
  | "connected_no_audit"
  | "audit_no_action"
  | "dormant";

/** Everything the decision needs, gathered by the caller. */
export interface MemberFacts {
  memberId: string;
  createdAt: string;
  /** Has the member linked an entity? */
  hasClaim: boolean;
  /** When the claim was made, if it was. */
  claimedAt?: string | null;
  /** Is a Google Business Profile connected? */
  hasConnection: boolean;
  connectedAt?: string | null;
  /** Has an audit ever been recorded for them? */
  hasAudit: boolean;
  firstAuditAt?: string | null;
  /** Have they actually changed anything on their listing through us? */
  hasChangeApplied: boolean;
  /** Most recent sign of life we can see, whatever the source. */
  lastActivityAt?: string | null;
  /** Stages already sent, so nothing repeats. */
  sentStages: LifecycleStage[];
  /** When we last sent this member anything from this sequence. */
  lastSentAt?: string | null;
}

/** How long after the triggering event each stage becomes appropriate. */
export const STAGE_DELAY_DAYS: Record<LifecycleStage, number> = {
  // Long enough that it doesn't collide with the welcome email.
  no_claim: 3,
  // They took the hardest step already; don't let it go cold.
  claimed_not_connected: 2,
  connected_no_audit: 2,
  // A week is enough time to have done something about a score.
  audit_no_action: 7,
  dormant: 21,
};

/** Minimum gap between any two emails in this sequence. */
export const QUIET_PERIOD_DAYS = 7;

const daysBetween = (from: string | null | undefined, now: Date): number | null => {
  if (!from) return null;
  const t = new Date(from).getTime();
  if (Number.isNaN(t)) return null;
  return (now.getTime() - t) / 86_400_000;
};

/**
 * Which stage a member is in right now, ignoring what's already been sent.
 *
 * Ordered from furthest-along backwards, so the most advanced true statement
 * wins. A connected member with no audit is not also "no claim"; telling them
 * to claim something would read as though nobody was paying attention.
 */
export function currentStage(facts: MemberFacts, now: Date = new Date()): LifecycleStage | null {
  const quiet = daysBetween(facts.lastActivityAt, now);

  if (facts.hasConnection && facts.hasAudit && !facts.hasChangeApplied) {
    return "audit_no_action";
  }
  if (facts.hasConnection && !facts.hasAudit) {
    return "connected_no_audit";
  }
  if (facts.hasClaim && !facts.hasConnection) {
    return "claimed_not_connected";
  }
  if (!facts.hasClaim && !facts.hasConnection) {
    return "no_claim";
  }
  // Everything done and still silent for a long time.
  if (quiet !== null && quiet >= STAGE_DELAY_DAYS.dormant) {
    return "dormant";
  }
  return null;
}

/** The event a stage's delay is measured from. */
function stageAnchor(stage: LifecycleStage, facts: MemberFacts): string | null | undefined {
  switch (stage) {
    case "no_claim": return facts.createdAt;
    case "claimed_not_connected": return facts.claimedAt ?? facts.createdAt;
    case "connected_no_audit": return facts.connectedAt ?? facts.createdAt;
    case "audit_no_action": return facts.firstAuditAt ?? facts.connectedAt;
    case "dormant": return facts.lastActivityAt ?? facts.createdAt;
  }
}

export interface LifecycleDecision {
  send: boolean;
  stage?: LifecycleStage;
  /** Why nothing is being sent — for the run log, so a quiet run is explicable. */
  reason?: string;
}

/**
 * Should this member get an email right now, and which one?
 *
 * Returns a reason when the answer is no, because "the job ran and sent
 * nothing" is only reassuring if you can see why.
 */
export function decide(facts: MemberFacts, now: Date = new Date()): LifecycleDecision {
  const stage = currentStage(facts, now);
  if (!stage) return { send: false, reason: "no stage applies" };

  if (facts.sentStages.includes(stage)) {
    return { send: false, reason: `${stage} already sent` };
  }

  const since = daysBetween(stageAnchor(stage, facts), now);
  if (since === null) return { send: false, reason: "no anchor date" };
  if (since < STAGE_DELAY_DAYS[stage]) {
    return { send: false, reason: `${stage} not due for ${(STAGE_DELAY_DAYS[stage] - since).toFixed(1)} more days` };
  }

  const sinceLast = daysBetween(facts.lastSentAt, now);
  if (sinceLast !== null && sinceLast < QUIET_PERIOD_DAYS) {
    return { send: false, reason: `quiet period — last email ${sinceLast.toFixed(1)} days ago` };
  }

  return { send: true, stage };
}
