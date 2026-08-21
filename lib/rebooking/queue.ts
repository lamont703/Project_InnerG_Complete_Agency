import "server-only";
import { shopifyGraphQL, isShopifyConfigured } from "@/lib/shopify";
import { buildDueList, computeCadence, CONTACT_THRESHOLD_DAYS, type CadenceResult, type VisitHistory } from "./cadence";
import { fetchAllNotes, type ClientNote } from "./notes";
import { computeBaseline, type BaselineBucket } from "./baseline";
import { visitGaps } from "./cadence";

/**
 * Pulls the barbershop's order history and turns it into "who is due for a cut".
 *
 * Every order in this store is a visit to the chair, so order timestamps stand
 * in for appointment times. That equivalence is the one assumption the whole
 * feature rests on: it holds because payment is taken at the chair, and it
 * would break the day deposits are charged ahead of a booking, because the
 * order date would then lead the visit rather than mark it.
 */

const ORDERS_QUERY = `
  query RebookingOrders($cursor: String) {
    orders(first: 250, after: $cursor, sortKey: CREATED_AT) {
      pageInfo { hasNextPage endCursor }
      nodes {
        createdAt
        currentTotalPriceSet { shopMoney { amount } }
        customer {
          id
          email
          firstName
          lastName
          phone
          emailMarketingConsent { marketingState }
          smsMarketingConsent { marketingState }
        }
      }
    }
  }
`;

interface OrderNode {
  createdAt: string;
  currentTotalPriceSet: { shopMoney: { amount: string } } | null;
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    emailMarketingConsent: { marketingState: string | null } | null;
    smsMarketingConsent: { marketingState: string | null } | null;
  } | null;
}

export type ReachableBy = "sms" | "email" | "none";

export interface DueClient extends CadenceResult {
  emailSubscribed: boolean;
  smsSubscribed: boolean;
  /**
   * The channel outreach should actually use.
   *
   * SMS wins when it is available because rebooking is a phone behaviour — but
   * it is available for very few people, which is the finding that shapes v1.
   */
  reachableBy: ReachableBy;
  /** What the barber knows about them, if anything has been written down. */
  note: ClientNote | null;
  /** True when cadenceDays came from a human override rather than the maths. */
  cadenceIsOverridden: boolean;
}

export interface RebookingQueue {
  clients: DueClient[];
  /** Everyone with a modelable rhythm, due or not — the denominator. */
  modelledClients: number;
  totalOrders: number;
  /** Sum of annual value across clients currently at risk. */
  revenueAtRisk: number;
  /** Held back by a note — snoozed, or marked no longer a client. */
  setAside: DueClient[];
  /** Contacted recently enough that chasing again would be nagging. */
  recentlyContacted: DueClient[];
  /**
   * EVERY client with a visit history, due or not — id and name only.
   *
   * Deliberately wider than the queue. A duplicate's real record is usually the
   * one that is perfectly up to date and therefore NOT due, so a roster built
   * from the queue cannot name it: KD Emanuel came in yesterday while his
   * duplicate "Kedrick Emanuel" sat in the at-risk list, and the merge target
   * was simply invisible. Used by the merge picker and by the note agent.
   */
  roster: { customerId: string; name: string }[];
  /** This shop's own un-nudged return curve — the comparison for any impact claim. */
  baseline: BaselineBucket[];
  /**
   * Modelled clients who are due or nearly due but under the contact threshold.
   *
   * Reported so the omission is visible. These are not missed — history says
   * ~85-92% of them come back with no message at all, which is precisely why
   * they are not chased.
   */
  returningOnTheirOwn: number;
  /** Every distinct visit day per client, for attributing outreach to visits. */
  visitDaysByCustomer: Map<string, string[]>;
  generatedAt: string;
  /** Set when credentials are missing, so the page can explain rather than crash. */
  notConfigured?: boolean;
}

/**
 * How long a client stays out of the queue after outreach goes out.
 *
 * Long enough that nobody gets chased twice in the same week, short enough that
 * someone who ignored one message is not lost for a month.
 */
export const CONTACT_COOLDOWN_DAYS = 14;

/**
 * Held out of the queue by something the barber wrote down.
 *
 * A snooze that has run out is simply over — the row is left alone and the
 * client reappears on their own, so nothing has to sweep the table on a
 * schedule.
 *
 * A snooze with NO date degrades to "back in the queue" rather than "hidden
 * forever". That is the safe direction: a half-filled form should not make
 * someone silently disappear. The server action refuses to save that state
 * anyway; this is the second line.
 *
 * Exported and pure so the rules are testable without a Shopify round trip.
 */
export function isSetAside(note: ClientNote | null, now: Date): boolean {
  if (!note) return false;
  if (note.mergedIntoCustomerId) return true;
  if (note.status === "inactive") return true;
  // A reduced client is only chased when a realistic longer cadence has been
  // set for them. Without one there is no honest answer to "when are they due",
  // so they are held out rather than guessed at — but they stay a client.
  if (note.status === "reduced") return !note.cadenceOverrideDays;
  if (note.status === "snoozed") {
    const todayKey = now.toISOString().slice(0, 10);
    return Boolean(note.snoozeUntil) && note.snoozeUntil! > todayKey;
  }
  return false;
}

/** Contacted recently enough that chasing again would be nagging. */
export function isCoolingOff(note: ClientNote | null, now: Date): boolean {
  const t = note?.lastContactedAt;
  if (!t) return false;
  return (now.getTime() - Date.parse(t)) / 86_400_000 < CONTACT_COOLDOWN_DAYS;
}

/** A guard against an unbounded loop if Shopify ever returns a stuck cursor. */
const MAX_PAGES = 60;

async function fetchAllOrders(): Promise<OrderNode[]> {
  const all: OrderNode[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data: { orders: { pageInfo: { hasNextPage: boolean; endCursor: string }; nodes: OrderNode[] } } =
      await shopifyGraphQL(ORDERS_QUERY, { cursor });
    all.push(...data.orders.nodes);
    if (!data.orders.pageInfo.hasNextPage) break;
    cursor = data.orders.pageInfo.endCursor;
  }

  return all;
}

function ordersToHistories(orders: OrderNode[]): {
  histories: VisitHistory[];
  consent: Map<string, { email: boolean; sms: boolean }>;
} {
  const byCustomer = new Map<string, VisitHistory>();
  const consent = new Map<string, { email: boolean; sms: boolean }>();

  for (const o of orders) {
    const c = o.customer;
    if (!c?.id) continue;

    if (!byCustomer.has(c.id)) {
      byCustomer.set(c.id, {
        customerId: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "(no name)",
        email: c.email,
        phone: c.phone,
        orderDates: [],
        lifetimeRevenue: 0,
      });
      consent.set(c.id, {
        email: c.emailMarketingConsent?.marketingState === "SUBSCRIBED",
        sms: c.smsMarketingConsent?.marketingState === "SUBSCRIBED",
      });
    }

    const h = byCustomer.get(c.id)!;
    h.orderDates.push(o.createdAt);
    h.lifetimeRevenue += parseFloat(o.currentTotalPriceSet?.shopMoney?.amount ?? "0");
  }

  return { histories: [...byCustomer.values()], consent };
}

export async function fetchRebookingQueue(now: Date = new Date()): Promise<RebookingQueue> {
  if (!isShopifyConfigured()) {
    return {
      clients: [],
      modelledClients: 0,
      totalOrders: 0,
      revenueAtRisk: 0,
      setAside: [],
      recentlyContacted: [],
      roster: [],
      baseline: [],
      returningOnTheirOwn: 0,
      visitDaysByCustomer: new Map(),
      generatedAt: now.toISOString(),
      notConfigured: true,
    };
  }

  const [orders, notes] = await Promise.all([fetchAllOrders(), fetchAllNotes()]);
  const { histories, consent } = ordersToHistories(orders);

  // The cadence override has to be applied BEFORE the due list is built, not
  // after. buildDueList decides who is due, how late they are and how the list
  // is ranked — all from the cadence — so overriding afterwards would leave a
  // client displayed with one interval and sorted by another.
  const overridden = histories.map((h) => {
    const o = notes.get(h.customerId)?.cadenceOverrideDays;
    return o && o > 0 ? { ...h, cadenceOverrideDays: o } : h;
  });

  const due = buildDueList(overridden, now);

  const all: DueClient[] = due.map((c) => {
    const k = consent.get(c.customerId) ?? { email: false, sms: false };
    const smsSubscribed = k.sms && Boolean(c.phone);
    const emailSubscribed = k.email && Boolean(c.email);
    const note = notes.get(c.customerId) ?? null;
    return {
      ...c,
      emailSubscribed,
      smsSubscribed,
      reachableBy: smsSubscribed ? "sms" : emailSubscribed ? "email" : "none",
      note,
      cadenceIsOverridden: Boolean(note?.cadenceOverrideDays && note.cadenceOverrideDays > 0),
    };
  });

  const setAside = all.filter((c) => isSetAside(c.note, now));
  const rest = all.filter((c) => !isSetAside(c.note, now));
  const recentlyContacted = rest.filter((c) => isCoolingOff(c.note, now));
  const clients = rest.filter((c) => !isCoolingOff(c.note, now));

  // The denominator: everyone with enough history to model a rhythm at all,
  // whether or not they are due today. Counted straight from computeCadence
  // rather than by re-running buildDueList against a shifted clock — moving
  // `now` forward pushes every client past GONE_AFTER_DAYS and returns zero.
  const modelled = histories.filter((h) => computeCadence(h, now) !== null);
  const modelledClients = modelled.length;

  // Roster spans everyone we can model, not just who is due — see the field
  // comment on RebookingQueue.roster for why that difference matters.
  const roster = modelled
    .map((h) => ({ customerId: h.customerId, name: h.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const baseline = computeBaseline(histories, now);

  const visitDaysByCustomer = new Map<string, string[]>(
    histories.map((h) => [h.customerId, visitGaps(h.orderDates).dayKeys]),
  );

  // Due-ish but under the contact threshold: counted so the page can say how
  // many were deliberately left alone rather than silently dropping them.
  const returningOnTheirOwn = modelled.filter((h) => {
    const c = computeCadence(h, now);
    return c !== null && c.daysOverdue >= 0 && c.daysOverdue < CONTACT_THRESHOLD_DAYS;
  }).length;

  return {
    clients,
    modelledClients,
    totalOrders: orders.length,
    revenueAtRisk: Number(
      clients
        // A reduced client's old annual value is already gone by their own
        // account. Counting it as "at risk" overstates the number.
        .filter((c) => c.note?.status !== "reduced")
        .filter((c) => c.status === "overdue" || c.status === "at_risk")
        .reduce((s, c) => s + c.annualValue, 0)
        .toFixed(2),
    ),
    setAside,
    recentlyContacted,
    roster,
    baseline,
    returningOnTheirOwn,
    visitDaysByCustomer,
    generatedAt: now.toISOString(),
  };
}
