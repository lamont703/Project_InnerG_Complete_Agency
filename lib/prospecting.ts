import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { outboundFetch } from "@/lib/outbound";
import { SITE_URL } from "@/lib/site";
import { PUBLIC_ENTITY_TYPES, type PublicEntityConfig } from "@/lib/gbp-audit-public";
import { auditPublicEntity } from "@/lib/gbp-audit-public-fetch";
import {
  LIVE_CHECKS_PER_DAY, PROSPECT_TYPES, liveChecksEnabled, median, needScore, parseRef, prospectRef, qualifies, signalsFor,
  type Need, type PipelineStatus, type ProspectType, type Signal,
} from "@/lib/prospecting-rules";

/**
 * Agency prospecting: finding businesses in the directory worth pitching,
 * auditing them from our own data, checking one live on Google (capped), and
 * a saved pipeline. Rules in lib/prospecting-rules.ts.
 *
 * Decided with the product owner 2026-09-29:
 *  - Contact details: phone and website — NEVER email.
 *  - No reservations: saving a prospect doesn't stop another agency.
 *  - Audits come from stored directory data, free, labeled with its date.
 *  - A live Google check is capped at LIVE_CHECKS_PER_DAY per agency, asks
 *    for text fields only (no photos), and writes what it finds back to the
 *    directory so the data gets fresher for everyone.
 */

const db = () => createAdminClient() as any;

const SHOP_LIKE = new Set(["shop", "salon"]);

function columnsFor(key: string, cfg: PublicEntityConfig) {
  return [
    "id", "slug", "city", "formatted_address", "phone", "website", "rating", "place_id", "updated_at", cfg.nameField, cfg.reviewField,
    ...(SHOP_LIKE.has(key) ? ["review_momentum_status", "booth_count_available", "claimed_at"] : []),
  ].join(", ");
}

export interface Prospect {
  ref: string;
  entityType: string;
  entityId: string;
  typeLabel: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews: number;
  signals: Signal[];
  score: number;
  dataAsOf: string | null;
  listingUrl: string;
  mapsUrl: string | null;
  savedStatus: PipelineStatus | null;
}

function toProspect(key: string, cfg: PublicEntityConfig, r: any, signals: Signal[], saved: Map<string, PipelineStatus>): Prospect {
  return {
    ref: prospectRef(key, r.slug),
    entityType: key,
    entityId: r.id,
    typeLabel: cfg.label,
    name: r[cfg.nameField] || "Unnamed business",
    city: r.city ?? null,
    address: r.formatted_address ?? null,
    phone: r.phone || null,
    website: r.website || null,
    rating: r.rating != null ? Number(r.rating) : null,
    reviews: Number(r[cfg.reviewField] || 0),
    signals,
    score: needScore(signals),
    dataAsOf: r.updated_at ? String(r.updated_at).slice(0, 10) : null,
    listingUrl: `${SITE_URL}${cfg.route}/${r.slug}`,
    mapsUrl: r.place_id ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}` : null,
    savedStatus: saved.get(`${key}:${r.id}`) ?? null,
  };
}

async function savedMap(agencyMemberId: string): Promise<Map<string, PipelineStatus>> {
  const { data } = await db().from("agency_prospects").select("entity_type, entity_id, status").eq("agency_member_id", agencyMemberId);
  return new Map((data || []).map((p: any) => [`${p.entity_type}:${p.entity_id}`, p.status]));
}

/** Businesses already on ShearQuery can't be credited to anyone — they're left out. */
async function claimedIds(key: string, ids: string[]): Promise<Set<string>> {
  if (!SHOP_LIKE.has(key) || !ids.length) return new Set();
  const out = new Set<string>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db().from("community_member_entity_links").select("entity_id").eq("entity_type", key).in("entity_id", ids.slice(i, i + 300));
    for (const r of data || []) out.add(r.entity_id);
  }
  return out;
}

export async function findProspects(args: { agencyMemberId: string; type: ProspectType; city?: string; zip?: string; needs?: Need[]; limit?: number }) {
  const limit = Math.min(Math.max(args.limit ?? 15, 1), 25);
  const saved = await savedMap(args.agencyMemberId);
  const found: Prospect[] = [];
  let looked = 0;
  for (const key of PROSPECT_TYPES[args.type]) {
    const cfg = PUBLIC_ENTITY_TYPES[key];
    let q = db().from(cfg.table).select(columnsFor(key, cfg)).not("slug", "is", null).limit(4000);
    if (args.city) q = q.ilike("city", `${args.city.replace(/[%,()]/g, "").trim()}%`);
    if (args.zip) q = q.ilike("formatted_address", `%${args.zip.replace(/\D/g, "").slice(0, 5)}%`);
    const { data, error } = await q;
    if (error) throw new Error(`directory read failed: ${error.message}`);
    const rows: any[] = data || [];
    looked += rows.length;
    const cityMedian = median(rows.map((r) => Number(r[cfg.reviewField] || 0)));
    const claimed = await claimedIds(key, rows.map((r) => r.id));
    for (const r of rows) {
      if (r.claimed_at || claimed.has(r.id)) continue;
      const signals = signalsFor(
        { rating: r.rating != null ? Number(r.rating) : null, reviews: Number(r[cfg.reviewField] || 0), momentum: r.review_momentum_status ?? null, website: r.website || null, openBooths: r.booth_count_available ?? null },
        cityMedian,
        args.city ?? null
      );
      if (qualifies(signals, args.needs)) found.push(toProspect(key, cfg, r, signals, saved));
    }
  }
  found.sort((a, b) => b.score - a.score || a.reviews - b.reviews);
  return { prospects: found.slice(0, limit), matched: found.length, looked };
}

/** A prospect by its ref ("shop:marcus-cuts-…"), or by name when that's unambiguous. */
export async function resolveProspect(query: string): Promise<{ key: string; cfg: PublicEntityConfig; row: any } | { error: string }> {
  const ref = parseRef(query);
  if (ref && PUBLIC_ENTITY_TYPES[ref.entityType]) {
    const cfg = PUBLIC_ENTITY_TYPES[ref.entityType];
    const { data } = await db().from(cfg.table).select(columnsFor(ref.entityType, cfg)).eq("slug", ref.slug).maybeSingle();
    return data ? { key: ref.entityType, cfg, row: data } : { error: `No business with the id ${query}.` };
  }
  const name = String(query || "").replace(/[%,()]/g, "").trim();
  if (name.length < 3) return { error: "Give the business's name, or its id from find_prospects." };
  const hits: { key: string; cfg: PublicEntityConfig; row: any }[] = [];
  for (const [key, cfg] of Object.entries(PUBLIC_ENTITY_TYPES)) {
    const { data } = await db().from(cfg.table).select(columnsFor(key, cfg)).ilike(cfg.nameField, `%${name}%`).limit(5);
    for (const row of data || []) hits.push({ key, cfg, row });
  }
  if (hits.length === 1) return hits[0];
  if (!hits.length) return { error: `No business in the directory matches "${query}".` };
  return { error: `Several businesses match "${query}" — use one of these ids: ${hits.slice(0, 8).map((h) => `${h.row[h.cfg.nameField]} (${h.row.city ?? "?"}) = ${prospectRef(h.key, h.row.slug)}`).join("; ")}` };
}

export async function liveChecksLeft(agencyMemberId: string): Promise<number> {
  const { count } = await db().from("agency_live_checks").select("id", { count: "exact", head: true }).eq("agency_member_id", agencyMemberId).gte("created_at", new Date(Date.now() - 86400_000).toISOString());
  return Math.max(0, LIVE_CHECKS_PER_DAY - (count ?? 0));
}

/** Details and the stored-data audit for one prospect. Free; no Google call. */
export async function prospectDetails(agencyMemberId: string, query: string) {
  const found = await resolveProspect(query);
  if ("error" in found) return found;
  const { key, cfg, row } = found;
  const saved = await savedMap(agencyMemberId);
  // The audit's local benchmark is the same city comparison find_prospects
  // uses, so the two can't disagree about whether reviews are few.
  const scored = await auditPublicEntity(createAdminClient(), key, cfg, row.slug).catch(() => null);
  const bench = scored?.audit.benchmark;
  const signals = signalsFor(
    { rating: row.rating != null ? Number(row.rating) : null, reviews: Number(row[cfg.reviewField] || 0), momentum: row.review_momentum_status ?? null, website: row.website || null, openBooths: row.booth_count_available ?? null },
    bench && bench.sampleSize >= 5 ? bench.medianReviews : null,
    bench?.city ?? row.city ?? null
  );
  const prospect = toProspect(key, cfg, row, signals, saved);
  const onShearQuery = !!row.claimed_at || (await claimedIds(key, [row.id])).has(row.id);
  return { prospect, audit: scored?.audit ?? null, onShearQuery, liveChecksLeft: await liveChecksLeft(agencyMemberId) };
}

/**
 * One live look at the business on Google — text fields only, no photos —
 * counted against the agency's daily cap, and written back to the directory.
 */
export async function liveCheck(agencyMemberId: string, query: string) {
  if (!liveChecksEnabled()) return { error: "Live Google checks aren't available yet. Everything else works from ShearQuery's directory data, which shows the date it's from — check anything that may have changed (rating, review count, website) on Google Maps before pitching on it." };
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return { error: "Live checks aren't set up (no Google Maps key)." };
  const found = await resolveProspect(query);
  if ("error" in found) return found;
  const { key: entityType, cfg, row } = found;
  const left = await liveChecksLeft(agencyMemberId);
  if (left <= 0) return { error: `That's all ${LIVE_CHECKS_PER_DAY} live checks for the last 24 hours. The stored-data audit (prospect_details) still works, labeled with its date.` };

  // Recorded before the call so parallel checks can't slip past the cap; taken
  // back below if Google refuses the call, since a refusal isn't the agency's.
  const { data: check } = await db().from("agency_live_checks").insert({ agency_member_id: agencyMemberId, entity_type: entityType, entity_id: row.id }).select("id").single();
  const refused = async (res: Response) => {
    const body = await res.json().catch(() => ({}));
    if (check?.id) await db().from("agency_live_checks").delete().eq("id", check.id);
    console.error("[prospecting] Places API refused:", res.status, body?.error?.message);
    return { error: `Live checks aren't available right now — Google refused the request (${res.status}${body?.error?.status ? ` ${body.error.status}` : ""}). This didn't use one of today's checks; the stored-data audit still works.`, liveChecksLeft: left };
  };

  const FIELDS = ["id", "displayName", "formattedAddress", "rating", "userRatingCount", "websiteUri", "nationalPhoneNumber", "regularOpeningHours", "businessStatus", "googleMapsUri"];
  let place: any = null;
  let matchedByName = false;
  if (row.place_id) {
    const res = await outboundFetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(row.place_id)}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS.join(",") },
    });
    if (res.ok) place = await res.json();
    else if (res.status !== 404) return refused(res);
  }
  if (!place) {
    const res = await outboundFetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS.map((f) => `places.${f}`).join(",") },
      body: JSON.stringify({ textQuery: `${row[cfg.nameField]} ${row.formatted_address || row.city || ""}`.trim(), maxResultCount: 1 }),
    });
    if (!res.ok) return refused(res);
    place = (await res.json()).places?.[0] ?? null;
    matchedByName = !!place;
  }
  if (!place) return { error: "Google didn't return this business. It may have closed or changed its name.", liveChecksLeft: left - 1 };

  const before = { rating: row.rating != null ? Number(row.rating) : null, reviews: Number(row[cfg.reviewField] || 0), website: row.website ?? null, phone: row.phone ?? null };
  const now = {
    rating: place.rating ?? null,
    reviews: place.userRatingCount ?? 0,
    website: place.websiteUri ?? null,
    phone: place.nationalPhoneNumber ?? null,
    hours: (place.regularOpeningHours?.weekdayDescriptions as string[] | undefined) ?? null,
    status: place.businessStatus ?? null,
    name: place.displayName?.text ?? null,
    address: place.formattedAddress ?? null,
    mapsUrl: place.googleMapsUri ?? null,
  };

  // Fresher data for everyone. Only fields Google returned; never blanks one out.
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (now.rating != null) update.rating = now.rating;
  if (place.userRatingCount != null) update[cfg.reviewField] = now.reviews;
  if (now.website) update.website = now.website;
  if (now.phone) update.phone = now.phone;
  if (!row.place_id && place.id && !matchedByName) update.place_id = place.id;
  await db().from(cfg.table).update(update).eq("id", row.id);

  return { name: row[cfg.nameField], before, now, matchedByName, dataAsOf: row.updated_at ? String(row.updated_at).slice(0, 10) : null, liveChecksLeft: left - 1 };
}

export async function saveProspect(agencyMemberId: string, query: string, status?: PipelineStatus, note?: string | null) {
  const found = await resolveProspect(query);
  if ("error" in found) return found;
  const { key, cfg, row } = found;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) patch.status = status;
  if (note !== undefined) patch.note = note ? String(note).slice(0, 500) : null;
  const { data: existing } = await db().from("agency_prospects").select("id").eq("agency_member_id", agencyMemberId).eq("entity_type", key).eq("entity_id", row.id).maybeSingle();
  if (existing) {
    await db().from("agency_prospects").update(patch).eq("id", existing.id);
  } else {
    await db().from("agency_prospects").insert({
      agency_member_id: agencyMemberId, entity_type: key, entity_id: row.id, slug: row.slug, business_name: row[cfg.nameField] || "Unnamed business",
      city: row.city ?? null, status: status ?? "to_contact", note: note ? String(note).slice(0, 500) : null,
    });
  }
  return { ok: true as const, name: row[cfg.nameField], ref: prospectRef(key, row.slug), status: status ?? (existing ? null : "to_contact") };
}

/**
 * The agency's pipeline. A prospect whose business has since claimed its
 * listing through an account credited to this agency is marked joined here.
 */
export async function myProspects(agencyMemberId: string, status?: PipelineStatus) {
  const { data } = await db().from("agency_prospects").select("*").eq("agency_member_id", agencyMemberId).order("updated_at", { ascending: false }).limit(300);
  const list: any[] = data || [];
  const open = list.filter((p) => p.status !== "joined" && SHOP_LIKE.has(p.entity_type));
  if (open.length) {
    const { data: links } = await db().from("community_member_entity_links").select("entity_type, entity_id, community_member_id").in("entity_id", open.map((p) => p.entity_id));
    if (links?.length) {
      const { data: refs } = await db().from("agency_referrals").select("client_member_id").eq("agency_member_id", agencyMemberId).in("client_member_id", links.map((l: any) => l.community_member_id));
      const mine = new Set((refs || []).map((r: any) => r.client_member_id));
      for (const p of open) {
        const l = links.find((x: any) => x.entity_id === p.entity_id && x.entity_type === p.entity_type);
        if (l && mine.has(l.community_member_id)) {
          await db().from("agency_prospects").update({ status: "joined", updated_at: new Date().toISOString() }).eq("id", p.id);
          p.status = "joined";
        }
      }
    }
  }
  return status ? list.filter((p) => p.status === status) : list;
}
