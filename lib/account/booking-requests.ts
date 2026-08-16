import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMemberContext, type ViewAsMember } from "@/lib/account/view-as";
import { LEAD_LISTING_BY_CLAIM_KEY } from "@/lib/account/listing-leads";

/**
 * A business owner's own booking requests.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE. app/api/community/register writes a
 * community_member_entity_links row for anyone who arrives from a "Claim your
 * shop" CTA and signs up. Nobody checks they own the business. That was
 * tolerable when a link bought a badge and listing edits; it is not tolerable
 * when it buys the name, phone number and email address of real customers.
 *
 * So ownership alone opens this page, and VERIFIED ownership is what shows who
 * is asking. An unverified owner sees that requests exist, when they are for
 * and what service — enough to know the page is worth coming back to, and
 * nothing that could be harvested.
 *
 * The obvious objection is that the SMS already contains all of it. It does —
 * but it goes to the phone number ON THE LISTING, which is verification by
 * possession. This page goes to whoever filled in a signup form. Same data,
 * completely different trust model, and only one of them can be obtained by
 * guessing a slug.
 *
 * Redaction happens HERE, at the fetch, not in the component. A view that has
 * to remember to hide a field will eventually forget, and the failure is
 * silent — the page renders fine, it just shows a stranger someone's phone
 * number.
 */

/** The statuses an owner is allowed to set, and what each means. */
export const OWNER_SETTABLE_STATUSES = ["contacted", "booked", "declined"] as const;
export type OwnerSettableStatus = (typeof OWNER_SETTABLE_STATUSES)[number];

export interface OwnerBookingRequest {
  id: string;
  requestedDate: string;
  requestedTime: string;
  serviceName: string | null;
  servicePrice: string | null;
  status: string;
  createdAt: string;
  notes: string | null;
  /** Null unless ownership is verified. See the header. */
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
}

export interface OwnerBookingView {
  listing: { route: string; slug: string; name: string; entityType: string; entityId: string };
  verified: boolean;
  verificationMethod: string | null;
  /** Present so the page can warn an admin that its buttons are inert. */
  impersonating: boolean;
  viewingAs: ViewAsMember | null;
  requests: OwnerBookingRequest[];
  /** Kept separate from requests.length so the "N waiting" count is honest. */
  openCount: number;
}

const OPEN = new Set(["new", "notified"]);

/**
 * The redaction, isolated so it is obvious and testable.
 *
 * Notes are withheld too. "Please use the back entrance, I'm in a wheelchair"
 * is the customer describing themselves to a business they chose — it is not
 * less sensitive than the phone number just because it is free text.
 */
export function toOwnerRequest(row: any, verified: boolean): OwnerBookingRequest {
  return {
    id: row.id,
    requestedDate: row.requested_date,
    requestedTime: row.requested_time,
    serviceName: row.service_name ?? null,
    servicePrice: row.service_price ?? null,
    status: row.status,
    createdAt: row.created_at,
    notes: verified ? row.customer_notes ?? null : null,
    customerName: verified ? row.customer_name ?? null : null,
    customerPhone: verified ? row.customer_phone ?? null : null,
    customerEmail: verified ? row.customer_email ?? null : null,
  };
}

/**
 * The link for the signed-in member, including whether it was ever proven.
 *
 * Deliberately its own query rather than a call to resolveOwnedListing(): that
 * helper does not select verified_at, and this page must never fall back to
 * "assume verified" because a column was missing from someone else's select.
 */
export async function resolveOwnedBookingContext(): Promise<
  | { status: 401 }
  | { listing: null }
  | { memberId: string;
      link: { entityType: string; entityId: string; verified: boolean; method: string | null };
      listing: { route: string; slug: string; name: string };
      impersonating: boolean;
      viewingAs: ViewAsMember | null }
> {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return { status: 401 };

  const admin = createAdminClient();
  const { data: link } = await (admin.from("community_member_entity_links") as any)
    .select("entity_type, entity_id, verified_at, verification_method")
    .eq("community_member_id", ctx.memberId)
    .maybeSingle();
  if (!link) return { listing: null };

  const cfg = LEAD_LISTING_BY_CLAIM_KEY[link.entity_type];
  if (!cfg) return { listing: null };

  const { data: row } = await (admin.from(cfg.table) as any)
    .select(`slug, ${cfg.nameCol}`)
    .eq("id", link.entity_id)
    .maybeSingle();
  if (!row?.slug) return { listing: null };

  return {
    memberId: ctx.memberId,
    link: {
      entityType: link.entity_type,
      entityId: link.entity_id,
      verified: Boolean(link.verified_at),
      method: link.verification_method ?? null,
    },
    listing: { route: cfg.route, slug: row.slug, name: row[cfg.nameCol] || row.slug },
    impersonating: ctx.impersonating,
    viewingAs: ctx.viewingAs,
  };
}

export async function fetchOwnerBookingView(): Promise<
  { status: 401 } | { listing: null } | OwnerBookingView
> {
  const resolved = await resolveOwnedBookingContext();
  if ("status" in resolved) return resolved;
  if (!("link" in resolved)) return { listing: null };

  const admin = createAdminClient();
  const { data } = await (admin.from("booking_requests") as any)
    .select(
      "id, requested_date, requested_time, service_name, service_price, status, created_at, " +
        "customer_name, customer_phone, customer_email, customer_notes"
    )
    // Scoped by the SERVER-DERIVED pair, never by anything from the client.
    .eq("entity_type", resolved.link.entityType)
    .eq("entity_id", resolved.link.entityId)
    .order("requested_date", { ascending: false })
    .limit(200);

  const rows = (data || []) as any[];
  return {
    listing: { ...resolved.listing, entityType: resolved.link.entityType, entityId: resolved.link.entityId },
    verified: resolved.link.verified,
    verificationMethod: resolved.link.method,
    impersonating: resolved.impersonating,
    viewingAs: resolved.viewingAs,
    requests: rows.map((r) => toOwnerRequest(r, resolved.link.verified)),
    openCount: rows.filter((r) => OPEN.has(r.status)).length,
  };
}
