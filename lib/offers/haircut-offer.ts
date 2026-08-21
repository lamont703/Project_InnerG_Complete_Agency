import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { shopifyGraphQL } from "@/lib/shopify";

/**
 * Creating and tracking the 20%-off haircut code.
 *
 * Every code is unique to one client, restricted to one product, usable once,
 * and dead after ten days. Each of those is load-bearing:
 *
 *   unique per client  - a redemption identifies WHO acted, which is what makes
 *                        this causal evidence rather than another correlation
 *   one product        - the offer is on the haircut, not on the whole store
 *   one use            - a code that can be reused is a permanent price cut
 *   ten days           - the urgency, and the reason it cannot quietly become a
 *                        standing discount for anyone who saved the text
 *
 * WHY IT IS ALSO LOCKED TO THE CUSTOMER IN SHOPIFY, not just named after them.
 * Codes get forwarded and screenshotted. `customerSelection` means a forwarded
 * code fails at checkout for anyone else, which protects both the margin and
 * the attribution — a redemption that could have come from anybody proves
 * nothing.
 */

/** The Straight UP Haircut — 2,408 of the store's ~3,000 orders. */
export const HAIRCUT_PRODUCT_ID = "gid://shopify/Product/7907431186597";

export const OFFER_PERCENT = 20;
export const OFFER_WINDOW_DAYS = 10;

/**
 * Discounts are only ever attached in these two places, and BOTH require an SMS
 * opt-in.
 *
 * 'sms_opt_in' is the reward for subscribing, minted when they reply YES.
 * 'win_back' goes to a client 60+ days past their rhythm who is ALREADY
 * subscribed — the discount is always the price of the channel, never a
 * standalone bribe to return.
 *
 * See the 20260821010000 migration for the arithmetic. Short version: routine
 * rebooking carries no discount because clients under 60 days late come back
 * 66–82% of the time unprompted, and paying them to do what they had already
 * decided to do costs margin and teaches the wrong lesson.
 */
export type OfferContext = "sms_opt_in" | "win_back";

/** A client must be at least this far past their rhythm to be worth a win-back offer. */
export const WIN_BACK_MIN_DAYS_LATE = 60;

export interface HaircutOffer {
  id: string;
  code: string;
  clientName: string | null;
  expiresAt: string;
  percentOff: number;
}

/**
 * Readable, unambiguous, and hard to mistype out loud.
 *
 * No 0/O/1/I/L — these get read off a phone screen in a barber's chair, and a
 * code that is ambiguous when spoken is a code that fails at checkout.
 */
function codeSuffix(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(4);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

function buildCode(clientName: string | null, context: OfferContext): string {
  const first = (clientName ?? "").trim().split(/\s+/)[0] ?? "";
  const clean = first.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 10);
  const prefix = context === "sms_opt_in" ? "TEXT" : "BACK";
  return clean ? `${prefix}-${clean}-${codeSuffix()}` : `${prefix}-${codeSuffix()}`;
}

const CREATE_MUTATION = `
  mutation CreateHaircutOffer($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode { id }
      userErrors { field message }
    }
  }
`;

export async function createHaircutOffer(input: {
  shopifyCustomerId: string;
  clientName: string | null;
  context: OfferContext;
  now?: Date;
}): Promise<{ ok: true; offer: HaircutOffer } | { ok: false; error: string }> {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + OFFER_WINDOW_DAYS * 86_400_000);
  const code = buildCode(input.clientName, input.context);
  const db = createAdminClient();

  try {
    const data: any = await shopifyGraphQL(CREATE_MUTATION, {
      basicCodeDiscount: {
        title: `${OFFER_PERCENT}% off haircut — ${input.clientName ?? "client"} (${input.context})`,
        code,
        startsAt: now.toISOString(),
        endsAt: expiresAt.toISOString(),
        // Locked to one customer: a forwarded code fails for anyone else, which
        // protects the margin and keeps a redemption attributable to one person.
        customerSelection: { customers: { add: [input.shopifyCustomerId] } },
        customerGets: {
          value: { percentage: OFFER_PERCENT / 100 },
          items: { products: { productsToAdd: [HAIRCUT_PRODUCT_ID] } },
        },
        appliesOncePerCustomer: true,
        usageLimit: 1,
      },
    });

    const errs = data?.discountCodeBasicCreate?.userErrors ?? [];
    if (errs.length) {
      const msg = errs.map((e: any) => `${(e.field ?? []).join(".")}: ${e.message}`).join("; ");
      return { ok: false, error: msg };
    }

    const discountId = data?.discountCodeBasicCreate?.codeDiscountNode?.id ?? null;

    const { data: row, error } = await (db.from("haircut_offers") as any)
      .insert({
        code,
        shopify_discount_id: discountId,
        shopify_customer_id: input.shopifyCustomerId,
        client_name: input.clientName,
        context: input.context,
        percent_off: OFFER_PERCENT,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
    if (error) return { ok: false, error: `Discount created in Shopify but not recorded: ${error.message}` };

    return {
      ok: true,
      offer: {
        id: row.id,
        code: row.code,
        clientName: row.client_name,
        expiresAt: row.expires_at,
        percentOff: row.percent_off,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Is this client already holding a live offer? Stops stacking codes on one person. */
export async function hasOpenOffer(shopifyCustomerId: string, now = new Date()): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await (db.from("haircut_offers") as any)
    .select("id")
    .eq("shopify_customer_id", shopifyCustomerId)
    .is("redeemed_at", null)
    .gt("expires_at", now.toISOString())
    .limit(1);
  return ((data ?? []) as unknown[]).length > 0;
}

const ORDERS_WITH_CODES = `
  query RedeemedCodes($cursor: String) {
    orders(first: 250, after: $cursor, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        createdAt
        discountCodes
        currentTotalPriceSet { shopMoney { amount } }
      }
    }
  }
`;

/**
 * Match issued codes against orders that actually used them.
 *
 * POLLED, NOT WEBHOOKED, on purpose: orders are already the source of truth for
 * the cadence model and the impact panel, and a webhook would introduce a
 * second version of "did they come back" that can disagree with the first.
 *
 * Only recent orders are scanned — a code lives ten days, so anything older
 * than a month cannot belong to an open one.
 */
export async function reconcileRedemptions(now = new Date()): Promise<{ checked: number; matched: number }> {
  const db = createAdminClient();
  const { data: open } = await (db.from("haircut_offers") as any)
    .select("id, code, issued_at")
    .is("redeemed_at", null);

  const offers = (open ?? []) as { id: string; code: string; issued_at: string }[];
  if (offers.length === 0) return { checked: 0, matched: 0 };

  const byCode = new Map(offers.map((o) => [o.code.toUpperCase(), o]));
  const cutoff = now.getTime() - 45 * 86_400_000;

  let cursor: string | null = null;
  let matched = 0;

  for (let page = 0; page < 8; page++) {
    const data: any = await shopifyGraphQL(ORDERS_WITH_CODES, { cursor });
    const nodes = data.orders.nodes as {
      id: string;
      createdAt: string;
      discountCodes: string[];
      currentTotalPriceSet: { shopMoney: { amount: string } } | null;
    }[];
    if (nodes.length === 0) break;

    for (const o of nodes) {
      for (const raw of o.discountCodes ?? []) {
        const hit = byCode.get(String(raw).toUpperCase());
        if (!hit) continue;
        await (db.from("haircut_offers") as any)
          .update({
            redeemed_at: o.createdAt,
            redeemed_order_id: o.id,
            redeemed_amount: parseFloat(o.currentTotalPriceSet?.shopMoney?.amount ?? "0"),
          })
          .eq("id", hit.id);
        byCode.delete(String(raw).toUpperCase());
        matched++;
      }
    }

    const oldest = nodes[nodes.length - 1];
    if (Date.parse(oldest.createdAt) < cutoff) break;
    if (!data.orders.pageInfo.hasNextPage) break;
    cursor = data.orders.pageInfo.endCursor;
  }

  return { checked: offers.length, matched };
}

export interface OfferStats {
  issued: number;
  redeemed: number;
  expiredUnused: number;
  outstanding: number;
  revenueFromRedemptions: number;
  discountGivenAway: number;
  byContext: Record<OfferContext, { issued: number; redeemed: number }>;
}

export async function offerStats(now = new Date()): Promise<OfferStats> {
  const db = createAdminClient();
  const { data } = await (db.from("haircut_offers") as any).select("*");
  const rows = (data ?? []) as Record<string, any>[];

  const stats: OfferStats = {
    issued: rows.length,
    redeemed: 0,
    expiredUnused: 0,
    outstanding: 0,
    revenueFromRedemptions: 0,
    discountGivenAway: 0,
    byContext: { sms_opt_in: { issued: 0, redeemed: 0 }, win_back: { issued: 0, redeemed: 0 } },
  };

  for (const r of rows) {
    const ctx = (r.context === "sms_opt_in" ? "sms_opt_in" : "win_back") as OfferContext;
    stats.byContext[ctx].issued++;
    if (r.redeemed_at) {
      stats.redeemed++;
      stats.byContext[ctx].redeemed++;
      const amt = Number(r.redeemed_amount ?? 0);
      stats.revenueFromRedemptions += amt;
      // What the 20% cost: the order total is already net of it, so the
      // discount is that share of the pre-discount price.
      const pct = Number(r.percent_off ?? OFFER_PERCENT) / 100;
      stats.discountGivenAway += pct > 0 && pct < 1 ? (amt / (1 - pct)) * pct : 0;
    } else if (Date.parse(r.expires_at) < now.getTime()) {
      stats.expiredUnused++;
    } else {
      stats.outstanding++;
    }
  }

  stats.revenueFromRedemptions = Number(stats.revenueFromRedemptions.toFixed(2));
  stats.discountGivenAway = Number(stats.discountGivenAway.toFixed(2));
  return stats;
}
