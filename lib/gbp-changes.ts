import "server-only";
import { outboundFetch } from "@/lib/outbound";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { gbpAccessToken, isGbpReconnectRequired, markGbpRevoked } from "@/lib/google-business";
import {
  readLocationFields,
  writeLocationFields,
  revertLocationFields,
  readAttributes,
  writeAttributes,
  revertAttributes,
  writeReviewReply,
  revertReviewReply,
  writePlaceActionLink,
  writeMediaFromUrl,
  deleteMedia,
  writeLocalPost,
  deleteLocalPost,
  type WriteResult,
} from "@/lib/gbp-write";
import { validateDescription } from "@/lib/gbp-description";
import { mergeSpecialHours, type HolidayDecision, type SpecialHourPeriod } from "@/lib/gbp-special-hours";
import { mergeCategories, mergeServiceItems, type Category, type ServiceType } from "@/lib/gbp-services";
import { buildQuestionnaire, answersToAttributes, type AvailableAttribute } from "@/lib/gbp-attribute-questionnaire";
import { validateDraft } from "@/lib/gbp-review-replies";
import { validateBookingUrl, isEditable, buildBookingState, type PlaceActionLink } from "@/lib/gbp-place-actions";
import { validatePost, type CallToActionType } from "@/lib/gbp-posts";
import { validateOffer, toLocalPostOffer, type OfferDraft } from "@/lib/gbp-post-offers";
import { validateSchedule, describeSchedule } from "@/lib/gbp-post-schedule";
import { PHOTO_CATEGORIES } from "@/lib/gbp-photos";
import { sendGhlEmail } from "@/lib/ghl-email";
import {
  mergeRegularHours,
  describeWeek,
  normaliseTime,
  normaliseCategoryName,
  normaliseAttributeName,
  resourceUnderLocation,
  isIsoDate,
  formatClock,
  type RegularHoursInput,
} from "@/lib/gbp-change-rules";
import { kindOf, describeChange } from "@/lib/gbp-change-describe";

/**
 * Changing an owner's Google Business Profile from Claude.
 *
 * THREE STEPS, AND THE MIDDLE ONE IS THE OWNER'S.
 *
 *   draft    → validate, show exactly what will change, store it as PENDING.
 *              Touches nothing on Google.
 *   publish  → a separate MCP tool, annotated as destructive, so Claude asks the
 *              owner before it runs. Only then does anything reach Google.
 *   undo     → from the snapshot the write layer took before publishing.
 *
 * The owner chose to approve inside Claude rather than on shearquery.com
 * (2026-09-27), because barbers live in Claude and will not come to the site
 * to click Approve. That moves the consent from our page to Claude's own
 * permission prompt, and the protections that make up for it live here: a
 * draft expires, a publish is capped per day, every publish emails the owner,
 * and every publish is recorded against the key that asked for it.
 *
 * WHAT IS STORED IS THE INTENT, NOT THE FINAL VALUE. Categories, services and
 * both kinds of hours are replaced WHOLESALE by Google. A complete value
 * computed at draft time and sent an hour later would erase anything changed
 * in Google's own interface in between. So a draft records "add these, remove
 * those", and publish re-reads Google and merges again — the same rule every
 * website route already follows.
 *
 * The write layer (lib/gbp-write.ts) owns the snapshot-before-write and
 * read-back-after guarantees. Nothing here talks to Google's write endpoints
 * except through it.
 */

const SITE = SITE_URL;
const BIZ_INFO = "https://mybusinessbusinessinformation.googleapis.com/v1";
const V4 = "https://mybusiness.googleapis.com/v4";
const PLACE_ACTIONS = "https://mybusinessplaceactions.googleapis.com/v1";

/** A draft older than this is refused at publish. Yesterday's plan is not today's. */
export const DRAFT_TTL_HOURS = 24;

/**
 * Publishes per owner per rolling day, from Claude.
 *
 * Not a product limit: an owner fixing their whole profile in one sitting does
 * perhaps fifteen. It bounds the damage from a leaked connection URL or a
 * model stuck in a loop to something an owner can undo in one evening.
 */
export const DAILY_PUBLISH_CAP = 30;

export type ChangeKind =
  | "description"
  | "regular_hours"
  | "holiday_hours"
  | "contact"
  | "categories"
  | "services"
  | "attributes"
  | "review_reply"
  | "booking_link"
  | "post"
  | "photo_add"
  | "photo_remove";

/** Google-side surface name, matching what the website routes write to gbp_change_requests. */
const SURFACE: Record<ChangeKind, string> = {
  description: "description",
  regular_hours: "regularHours",
  holiday_hours: "specialHours",
  contact: "contact",
  categories: "categories",
  services: "serviceItems",
  attributes: "attributes",
  review_reply: "reviews",
  booking_link: "placeActionLinks",
  post: "localPosts",
  photo_add: "media",
  photo_remove: "media",
};

export const KIND_LABEL: Record<ChangeKind, string> = {
  description: "business description",
  regular_hours: "weekly opening hours",
  holiday_hours: "holiday / special hours",
  contact: "phone number or website",
  categories: "additional categories",
  services: "services",
  attributes: "attributes",
  review_reply: "review reply",
  booking_link: "booking link",
  post: "Google post",
  photo_add: "new photo",
  photo_remove: "photo removal",
};

/** How a kind can be undone, stated before anyone publishes it. */
const UNDO_NOTE: Record<ChangeKind, string> = {
  description: "Can be undone: the previous description is restored.",
  regular_hours: "Can be undone: the previous weekly hours are restored.",
  holiday_hours: "Can be undone: the previous special hours are restored.",
  contact: "Can be undone: the previous phone number and website are restored.",
  categories: "Can be undone: the previous category list is restored.",
  services: "Can be undone: the previous service list is restored.",
  attributes: "Mostly undoable: answers that existed before are restored, but an attribute that was blank before cannot be blanked again through Google's API.",
  review_reply: "Can be undone: the reply is removed (or the previous reply put back). Anyone who already read it has read it.",
  booking_link: "CANNOT be undone from here. To reverse it, draft the opposite change.",
  post: "Can be undone by deleting the post. Anyone who already saw it has seen it.",
  photo_add: "Can be undone: the photo is deleted from the listing.",
  photo_remove: "CANNOT be undone. A deleted photo is gone from Google; it would have to be uploaded again.",
};

// ── connection ──────────────────────────────────────────────────────────────

export interface OwnerGbp {
  token: string;
  locationName: string;
  accountName: string | null;
}

type Resolved = ({ ok: true } & OwnerGbp) | { ok: false; message: string };

/**
 * The owner's Google connection, ready to call.
 *
 * Every failure is a sentence that names the fix, because the model repeats it
 * to the owner verbatim. "Not connected" and "expired" are not errors to retry,
 * and a model that cannot tell them from an outage will keep retrying.
 */
export async function resolveOwnerGbp(memberId: string, opts: { account?: boolean } = {}): Promise<Resolved> {
  const admin = createAdminClient();
  const { data: conn } = await (admin.from("gbp_connections") as any)
    .select("refresh_token, selected_location, locations, status")
    .eq("community_member_id", memberId)
    .maybeSingle();

  if (!conn?.refresh_token) {
    return { ok: false, message: `This owner has not connected their Google Business Profile. They connect it at ${SITE}/account/gbp-audit.` };
  }
  if (String(conn.status) === "revoked") {
    return { ok: false, message: `The Google connection has expired and must be reconnected at ${SITE}/account/gbp-audit. Retrying will not fix it.` };
  }
  const locationName: string | null =
    conn.selected_location ||
    (Array.isArray(conn.locations) && conn.locations.length === 1 ? conn.locations[0]?.name : null);
  if (!locationName) {
    return { ok: false, message: `Google is connected but no location has been chosen. The owner picks one at ${SITE}/account/gbp-audit.` };
  }

  let token: string;
  try {
    token = await gbpAccessToken(conn.refresh_token);
  } catch (e: any) {
    if (isGbpReconnectRequired(e)) {
      await markGbpRevoked(admin, { community_member_id: memberId });
      return { ok: false, message: `The Google connection has expired and must be reconnected at ${SITE}/account/gbp-audit. Retrying will not fix it.` };
    }
    return { ok: false, message: `Could not reach Google: ${e?.message || "unknown error"}` };
  }

  let accountName: string | null = null;
  if (opts.account) {
    const res = await outboundFetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    accountName = res.ok ? (await res.json())?.accounts?.[0]?.name ?? null : null;
    if (!accountName) return { ok: false, message: "Google did not return an account for this connection. It may need reconnecting." };
  }

  return { ok: true, token, locationName, accountName };
}

async function gget(url: string, token: string): Promise<any | null> {
  const res = await outboundFetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  return res.ok ? res.json().catch(() => null) : null;
}

// ── shared Google reads ─────────────────────────────────────────────────────

/** The attribute catalogue Google offers for this location's primary category. */
export async function fetchAvailableAttributes(token: string, locationName: string): Promise<AvailableAttribute[]> {
  const loc = await gget(`${BIZ_INFO}/${locationName}?readMask=categories`, token);
  const category = loc?.categories?.primaryCategory?.name;
  if (!category) return [];
  const body = await gget(
    `${BIZ_INFO}/attributes?categoryName=${encodeURIComponent(category)}&regionCode=US&languageCode=en`,
    token
  );
  return body?.attributeMetadata || [];
}

/**
 * Service types for every category on the listing, not just the primary — a
 * shop that is both "Barber shop" and "Beauty salon" can offer from either.
 */
export async function fetchServiceTypes(token: string, categories: Category[]): Promise<ServiceType[]> {
  const names = categories.map((c) => c?.name).filter(Boolean);
  if (!names.length) return [];
  const params = new URLSearchParams({ regionCode: "US", languageCode: "en", view: "FULL" });
  for (const n of names) params.append("names", n);
  const body = await gget(`${BIZ_INFO}/categories:batchGet?${params}`, token);

  const seen = new Set<string>();
  const out: ServiceType[] = [];
  for (const cat of body?.categories || []) {
    for (const st of cat.serviceTypes || []) {
      if (!st?.serviceTypeId || seen.has(st.serviceTypeId)) continue;
      seen.add(st.serviceTypeId);
      out.push({ serviceTypeId: st.serviceTypeId, displayName: st.displayName });
    }
  }
  return out;
}

/** Look categories up by resource name, which also proves they exist. */
async function lookupCategories(token: string, names: string[]): Promise<Category[]> {
  if (!names.length) return [];
  const params = new URLSearchParams({ regionCode: "US", languageCode: "en", view: "BASIC" });
  for (const n of names) params.append("names", n);
  const body = await gget(`${BIZ_INFO}/categories:batchGet?${params}`, token);
  return (body?.categories || []).map((c: any) => ({ name: c.name, displayName: c.displayName }));
}

export async function readBookingState(token: string, locationName: string) {
  const [links, types] = await Promise.all([
    gget(`${PLACE_ACTIONS}/${locationName}/placeActionLinks`, token),
    gget(
      `${PLACE_ACTIONS}/placeActionTypeMetadata?languageCode=en&filter=${encodeURIComponent("location=" + locationName)}`,
      token
    ),
  ]);
  return buildBookingState(links?.placeActionLinks || [], types?.placeActionTypeMetadata || []);
}

export const serviceLabel = (i: any, names: Map<string, string>) =>
  i.freeFormServiceItem?.label?.displayName ||
  names.get(i.structuredServiceItem?.serviceTypeId) ||
  String(i.structuredServiceItem?.serviceTypeId || "").replace(/^job_type_id:/, "").replace(/_/g, " ");

const quote = (s: unknown, max = 300) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `"${t.slice(0, max)}…"` : `"${t}"`;
};

// ── each kind: prepare (draft) and apply (publish) ──────────────────────────

type Prepared =
  | { ok: true; proposed: Record<string, unknown>; preview: string[]; warnings?: string[] }
  | { ok: false; message: string };

type Applied = WriteResult & { result?: string[] };

interface KindSpec {
  needsAccount?: boolean;
  prepare(input: Record<string, any>, g: OwnerGbp): Promise<Prepared>;
  apply(proposed: Record<string, any>, g: OwnerGbp, memberId: string, note: string): Promise<Applied>;
}

const SPECS: Record<ChangeKind, KindSpec> = {
  description: {
    async prepare(input, g) {
      const text = String(input.text ?? "").trim();
      const check = validateDescription(text);
      if (!check.ok) {
        return {
          ok: false,
          message: `That description breaks Google's rules, so it was not drafted:\n${check.issues.map((i) => `- ${i.message}`).join("\n")}`,
        };
      }
      const loc = await readLocationFields(g.token, g.locationName, "profile").catch(() => null);
      return {
        ok: true,
        proposed: { description: text },
        preview: [
          `CURRENT (${(loc?.profile?.description || "").length} characters): ${loc?.profile?.description ? quote(loc.profile.description, 750) : "none"}`,
          `NEW (${text.length} characters): ${quote(text, 750)}`,
        ],
        warnings: check.issues.map((i) => i.message),
      };
    },
    async apply(p, g, memberId, note) {
      return writeLocationFields({
        token: g.token, locationName: g.locationName, updateMask: "profile.description",
        patch: { name: g.locationName, profile: { description: p.description } }, memberId, note,
      });
    },
  },

  regular_hours: {
    async prepare(input, g) {
      const loc = await readLocationFields(g.token, g.locationName, "regularHours").catch(() => null);
      if (!loc) return { ok: false, message: "Could not read this listing's current hours from Google." };
      const current = loc.regularHours?.periods || [];
      const merged = mergeRegularHours(current, input.days);
      if (!merged.ok) return merged;
      return {
        ok: true,
        proposed: { days: input.days },
        preview: [
          `Changing: ${merged.days.map((d) => d[0] + d.slice(1).toLowerCase()).join(", ")}. Every other day stays as it is.`,
          "BEFORE:", ...describeWeek(current).map((l) => `  ${l}`),
          "AFTER:", ...describeWeek(merged.periods).map((l) => `  ${l}`),
        ],
      };
    },
    async apply(p, g, memberId, note) {
      // Merged again against what Google has NOW — see the file header.
      const loc = await readLocationFields(g.token, g.locationName, "regularHours").catch(() => null);
      if (!loc) return { ok: false, error: "Could not read the current hours from Google." };
      const merged = mergeRegularHours(loc.regularHours?.periods || [], p.days);
      if (!merged.ok) return { ok: false, error: merged.message };
      const write = await writeLocationFields({
        token: g.token, locationName: g.locationName, updateMask: "regularHours",
        patch: { name: g.locationName, regularHours: { periods: merged.periods } }, memberId, note,
      });
      return { ...write, result: describeWeek((write.after as any)?.regularHours?.periods || merged.periods) };
    },
  },

  holiday_hours: {
    async prepare(input, g) {
      const decisions = toHolidayDecisions(input.dates);
      if ("message" in decisions) return { ok: false, message: decisions.message };
      const loc = await readLocationFields(g.token, g.locationName, "specialHours").catch(() => null);
      if (!loc) return { ok: false, message: "Could not read this listing's special hours from Google." };
      return {
        ok: true,
        proposed: { decisions: decisions.list },
        preview: decisions.list.map((d) =>
          d.mode === "closed"
            ? `${d.date}: CLOSED all day`
            : d.mode === "clear"
              ? `${d.date}: remove the special hours (back to the usual weekly hours)`
              : `${d.date}: open ${formatClock(d.openTime)}–${formatClock(d.closeTime)}`
        ).concat("Every other special date already on the listing stays as it is."),
      };
    },
    async apply(p, g, memberId, note) {
      const loc = await readLocationFields(g.token, g.locationName, "specialHours").catch(() => null);
      if (!loc) return { ok: false, error: "Could not read the current special hours from Google." };
      const merged: SpecialHourPeriod[] = mergeSpecialHours(loc.specialHours?.specialHourPeriods || [], p.decisions);
      return writeLocationFields({
        token: g.token, locationName: g.locationName, updateMask: "specialHours",
        patch: { name: g.locationName, specialHours: { specialHourPeriods: merged } }, memberId, note,
      });
    },
  },

  contact: {
    async prepare(input, g) {
      const website = input.website != null ? String(input.website).trim() : null;
      const phone = input.phone != null ? String(input.phone).trim() : null;
      if (!website && !phone) return { ok: false, message: "Give a new website, a new phone number, or both." };

      if (website) {
        let u: URL;
        try { u = new URL(website); } catch { return { ok: false, message: `"${website}" is not a full web address. It should start with https://` }; }
        if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, message: "The website must be an http or https address." };
      }
      if (phone && phone.replace(/\D/g, "").length < 10) {
        return { ok: false, message: `"${phone}" does not look like a full phone number with area code.` };
      }

      const loc = await readLocationFields(g.token, g.locationName, "websiteUri,phoneNumbers").catch(() => null);
      if (!loc) return { ok: false, message: "Could not read the current phone and website from Google." };
      const preview: string[] = [];
      if (website) preview.push(`Website: ${loc.websiteUri || "none"} → ${website}`);
      if (phone) preview.push(`Primary phone: ${loc.phoneNumbers?.primaryPhone || "none"} → ${phone}`);
      if (phone && loc.phoneNumbers?.additionalPhones?.length) {
        preview.push(`Additional phone numbers are kept: ${loc.phoneNumbers.additionalPhones.join(", ")}`);
      }
      return {
        ok: true,
        proposed: { website, phone },
        preview,
        warnings: [
          "The phone number and website are what customers use to reach the business. Check each character before approving. Google can also hold an edit to these fields for review, and the result will show what Google actually has afterwards.",
        ],
      };
    },
    async apply(p, g, memberId, note) {
      const masks: string[] = [];
      const patch: Record<string, unknown> = { name: g.locationName };
      if (p.website) { masks.push("websiteUri"); patch.websiteUri = p.website; }
      if (p.phone) {
        const loc = await readLocationFields(g.token, g.locationName, "phoneNumbers").catch(() => null);
        masks.push("phoneNumbers");
        patch.phoneNumbers = { ...(loc?.phoneNumbers || {}), primaryPhone: p.phone };
      }
      const write = await writeLocationFields({
        token: g.token, locationName: g.locationName, updateMask: masks.join(","), patch, memberId, note,
      });
      const after: any = write.after || {};
      return {
        ...write,
        result: [
          p.website ? `Website on Google now: ${after.websiteUri ?? "(not returned)"}` : "",
          p.phone ? `Primary phone on Google now: ${after.phoneNumbers?.primaryPhone ?? "(not returned)"}` : "",
        ].filter(Boolean),
      };
    },
  },

  categories: {
    async prepare(input, g) {
      const addNames = (Array.isArray(input.add) ? input.add : []).map(normaliseCategoryName);
      const removeNames = (Array.isArray(input.remove) ? input.remove : []).map(normaliseCategoryName);
      if ([...addNames, ...removeNames].some((n) => !n)) {
        return { ok: false, message: 'Categories must be ids from find_google_categories, like "gcid:hair_salon".' };
      }
      if (!addNames.length && !removeNames.length) return { ok: false, message: "Nothing to add or remove." };

      const loc = await readLocationFields(g.token, g.locationName, "categories").catch(() => null);
      const primary: Category | null = loc?.categories?.primaryCategory ?? null;
      if (!primary) return { ok: false, message: "This listing has no primary category on Google." };
      if (removeNames.includes(primary.name) || addNames.includes(primary.name)) {
        return { ok: false, message: `"${primary.displayName}" is the PRIMARY category. It is not changed from here — changing what a business is can trigger Google re-verification. The owner changes it in Google's own interface.` };
      }

      const found = await lookupCategories(g.token, addNames as string[]);
      const unknown = (addNames as string[]).filter((n) => !found.some((c) => c.name === n));
      if (unknown.length) return { ok: false, message: `Google does not recognise: ${unknown.join(", ")}. Search with find_google_categories.` };

      const current: Category[] = loc?.categories?.additionalCategories ?? [];
      const merged = mergeCategories({ primary, currentAdditional: current, add: found, remove: removeNames as string[] });
      const warnings = merged.dropped.length
        ? [`Google allows 9 additional categories, so these would NOT be added: ${merged.dropped.map((c) => c.displayName).join(", ")}. Remove some first.`]
        : [];
      return {
        ok: true,
        proposed: { add: found, remove: removeNames },
        preview: [
          `Primary (unchanged): ${primary.displayName}`,
          `Additional BEFORE: ${current.map((c) => c.displayName).join(", ") || "none"}`,
          `Additional AFTER:  ${merged.additionalCategories.map((c) => c.displayName).join(", ") || "none"}`,
        ],
        warnings,
      };
    },
    async apply(p, g, memberId, note) {
      const loc = await readLocationFields(g.token, g.locationName, "categories").catch(() => null);
      const primary: Category | null = loc?.categories?.primaryCategory ?? null;
      if (!primary) return { ok: false, error: "This listing has no primary category on Google." };
      const merged = mergeCategories({
        primary, currentAdditional: loc.categories?.additionalCategories ?? [], add: p.add || [], remove: p.remove || [],
      });
      const write = await writeLocationFields({
        token: g.token, locationName: g.locationName, updateMask: "categories",
        patch: {
          name: g.locationName,
          categories: {
            primaryCategory: { name: primary.name },
            additionalCategories: merged.additionalCategories.map((c) => ({ name: c.name })),
          },
        },
        memberId, note,
      });
      const now: Category[] = (write.after as any)?.categories?.additionalCategories ?? merged.additionalCategories;
      return { ...write, result: [`Additional categories on Google now: ${now.map((c) => c.displayName).join(", ") || "none"}`] };
    },
  },

  services: {
    async prepare(input, g) {
      const plan = await planServices(input, g);
      if (!plan.ok) return plan;
      return {
        ok: true,
        proposed: { add_service_ids: plan.add, remove_service_ids: plan.remove, add_custom: plan.custom },
        preview: [
          plan.addedLabels.length ? `ADD: ${plan.addedLabels.join(", ")}` : "",
          plan.removedLabels.length ? `REMOVE: ${plan.removedLabels.join(", ")}` : "",
          `Services on the listing: ${plan.beforeCount} → ${plan.afterCount}. Everything not named above stays.`,
        ].filter(Boolean),
      };
    },
    async apply(p, g, memberId, note) {
      const plan = await planServices(p, g);
      if (!plan.ok) return { ok: false, error: plan.message };
      const write = await writeLocationFields({
        token: g.token, locationName: g.locationName, updateMask: "serviceItems",
        patch: { name: g.locationName, serviceItems: plan.merged }, memberId, note,
      });
      const count = ((write.after as any)?.serviceItems || plan.merged).length;
      return { ...write, result: [`Services on Google now: ${count}.`] };
    },
  },

  attributes: {
    async prepare(input, g) {
      const plan = await planAttributes(input, g);
      if (!plan.ok) return plan;
      return {
        ok: true,
        proposed: { answers: plan.answers },
        preview: plan.lines,
        warnings: plan.rejected.length
          ? [`Not offered for this business on Google, so skipped: ${plan.rejected.join(", ")}`]
          : [],
      };
    },
    async apply(p, g, memberId, note) {
      const plan = await planAttributes(p, g);
      if (!plan.ok) return { ok: false, error: plan.message };
      return writeAttributes({ token: g.token, locationName: g.locationName, attributes: plan.attributes, memberId, note });
    },
  },

  review_reply: {
    needsAccount: true,
    async prepare(input, g) {
      const reviewName = resourceUnderLocation({
        raw: input.review_id, accountName: g.accountName!, locationName: g.locationName, collection: "reviews",
      });
      if (!reviewName) return { ok: false, message: "That review id is not on this owner's listing. Use an id from my_reviews." };
      const text = String(input.text ?? "").trim();
      if (!text) return { ok: false, message: "The reply is empty." };
      if (text.length > 4096) return { ok: false, message: `The reply is ${text.length} characters; Google allows 4096.` };

      const review = await gget(`${V4}/${reviewName}`, g.token);
      if (!review) return { ok: false, message: "Google could not find that review. It may have been removed." };
      const quality = validateDraft(text);
      return {
        ok: true,
        proposed: { reviewName, comment: text },
        preview: [
          `REVIEW by ${review.reviewer?.displayName || "a customer"} — ${review.starRating || "?"} stars: ${review.comment ? quote(review.comment) : "(no text)"}`,
          review.reviewReply?.comment ? `EXISTING REPLY (will be replaced): ${quote(review.reviewReply.comment)}` : "No reply yet.",
          `NEW PUBLIC REPLY: ${quote(text, 4096)}`,
        ],
        warnings: quality.ok ? [] : [`This reply may read badly as published: ${quality.reason}. The best replies are two or three sentences.`],
      };
    },
    async apply(p, g, memberId, note) {
      return writeReviewReply({ token: g.token, reviewName: p.reviewName, comment: p.comment, locationName: g.locationName, memberId, note });
    },
  },

  booking_link: {
    async prepare(input, g) {
      const action = String(input.action || "");
      if (!["create", "update", "delete"].includes(action)) {
        return { ok: false, message: 'action must be "create", "update" or "delete".' };
      }
      const state = await readBookingState(g.token, g.locationName);
      let uri: string | undefined;
      if (action !== "delete") {
        const check = validateBookingUrl(String(input.url || ""));
        if (!check.ok) return { ok: false, message: check.issues.map((i) => i.message).join(" ") };
        uri = check.normalized;
      }

      let target: PlaceActionLink | undefined;
      if (action !== "create") {
        const linkName = String(input.link_id || "");
        target = state.links.find((l) => l.name === linkName || l.name?.endsWith(`/${linkName}`));
        if (!target) return { ok: false, message: "That booking link is not on this listing. Use a link id from my_google_profile." };
        if (!isEditable(target)) {
          return { ok: false, message: "That link was added by a booking provider (Booksy, Square…) and can only be changed with them." };
        }
      }
      return {
        ok: true,
        proposed: { action, uri: uri ?? null, linkName: target?.name ?? null, placeActionType: target?.placeActionType || input.type || "APPOINTMENT" },
        preview: [
          action === "create"
            ? `ADD a "Book" link: ${uri}`
            : action === "update"
              ? `CHANGE booking link ${target!.uri} → ${uri}`
              : `REMOVE booking link ${target!.uri}`,
        ],
      };
    },
    async apply(p, g, memberId, note) {
      return writePlaceActionLink({
        token: g.token, locationName: g.locationName, action: p.action, linkName: p.linkName ?? undefined,
        uri: p.uri ?? undefined, placeActionType: p.placeActionType, memberId, note,
      });
    },
  },

  post: {
    needsAccount: true,
    async prepare(input) {
      const summary = String(input.text ?? "").trim();
      const url = input.button_url ? String(input.button_url).trim() : undefined;
      const actionType = (String(input.button || (url ? "LEARN_MORE" : "CALL")).toUpperCase()) as CallToActionType;
      if (!["BOOK", "LEARN_MORE", "CALL", "SIGN_UP", "ORDER", "SHOP"].includes(actionType)) {
        return { ok: false, message: "button must be one of BOOK, LEARN_MORE, CALL, SIGN_UP, ORDER, SHOP." };
      }
      const check = validatePost(summary, { actionType, url });
      if (!check.ok) return { ok: false, message: check.issues.filter((i) => i.level === "error").map((i) => i.message).join(" ") };

      const photoUrl = input.photo_url ? String(input.photo_url).trim() : null;
      if (photoUrl && !/^https:\/\//i.test(photoUrl)) return { ok: false, message: "The photo must be a public https:// link." };

      let offer: OfferDraft | null = null;
      if (input.offer) {
        offer = {
          title: String(input.offer.title || ""),
          startDate: String(input.offer.start_date || ""),
          endDate: String(input.offer.end_date || ""),
          couponCode: input.offer.coupon_code ? String(input.offer.coupon_code) : null,
          redeemOnlineUrl: input.offer.redeem_url ? String(input.offer.redeem_url) : null,
          termsConditions: input.offer.terms ? String(input.offer.terms) : null,
        };
        const oc = validateOffer(offer);
        if (!oc.ok) return { ok: false, message: oc.issues.filter((i) => i.level === "error").map((i) => i.message).join(" ") };
      }

      const publishAt = input.publish_at ? String(input.publish_at) : null;
      if (publishAt) {
        const when = validateSchedule(publishAt);
        if (!when.ok) return { ok: false, message: when.issues.map((i) => i.message).join(" ") };
      }

      return {
        ok: true,
        proposed: { summary, actionType, url: url ?? null, photoUrl, offer, publishAt },
        preview: [
          offer ? `OFFER POST — "${offer.title}", ${offer.startDate} to ${offer.endDate}${offer.couponCode ? `, code ${offer.couponCode}` : ""}` : "STANDARD POST",
          `TEXT: ${quote(summary, 1500)}`,
          `BUTTON: ${actionType}${url ? ` → ${url}` : " (calls the listing's phone)"}`,
          photoUrl ? `PHOTO: ${photoUrl}` : "No photo.",
          publishAt ? `WHEN: ${describeSchedule(new Date(publishAt).toISOString())}` : "WHEN: as soon as it is approved.",
        ],
        warnings: check.issues.filter((i) => i.level === "warning").map((i) => i.message),
      };
    },
    async apply(p, g, memberId, note) {
      const built = p.offer ? toLocalPostOffer(p.offer) : null;

      // Scheduled: queued in our own table, which the gbp-publish-scheduled
      // cron sends when due and re-validates first. A post handed to Google
      // cannot be called back, so the queue has to be ours.
      if (p.publishAt) {
        const when = validateSchedule(p.publishAt);
        if (!when.ok) return { ok: false, error: when.issues.map((i) => i.message).join(" ") };
        const { data, error } = await (createAdminClient().from("gbp_scheduled_posts") as any)
          .insert({
            community_member_id: memberId, location_name: g.locationName,
            summary: p.summary, action_type: p.actionType, action_url: p.url ?? null,
            photo_url: p.photoUrl ?? null, event: built?.event ?? null, offer: built?.offer ?? null,
            angle_id: "claude", scheduled_for: new Date(p.publishAt).toISOString(),
          })
          .select("id, scheduled_for")
          .single();
        if (error || !data) return { ok: false, error: "Could not queue the post." };
        return { ok: true, result: [`Queued. It goes out ${describeSchedule(data.scheduled_for)}, and is checked again first in case an offer has expired.`], after: { scheduledPostId: data.id } };
      }

      const write = await writeLocalPost({
        token: g.token, accountName: g.accountName!, locationName: g.locationName,
        summary: p.summary, photoUrl: p.photoUrl, event: built?.event ?? null, offer: built?.offer ?? null,
        callToAction: { actionType: p.actionType, url: p.url ?? undefined }, memberId, note,
      });
      return { ...write, result: write.ok ? [`Live on Google as ${write.postName}.`] : undefined };
    },
  },

  photo_add: {
    needsAccount: true,
    async prepare(input) {
      const sourceUrl = String(input.image_url || "").trim();
      const category = String(input.category || "").toUpperCase();
      if (!/^https:\/\//i.test(sourceUrl)) return { ok: false, message: "The photo must be a public https:// link that Google can download." };
      if (!PHOTO_CATEGORIES.some((c) => c.category === category)) {
        return { ok: false, message: `category must be one of ${PHOTO_CATEGORIES.map((c) => c.category).join(", ")}.` };
      }
      // Checked now so a dead link fails at the draft, not after the owner approved it.
      const head = await outboundFetch(sourceUrl, { method: "HEAD", cache: "no-store" }).catch(() => null);
      const type = head?.headers.get("content-type") || "";
      if (!head?.ok) return { ok: false, message: `That link did not load (${head?.status ?? "no response"}). Google fetches the photo itself, so it must be publicly reachable.` };
      if (type && !/^image\/(jpeg|png|webp)/i.test(type)) return { ok: false, message: `That link serves ${type}, not a JPEG, PNG or WebP image.` };
      const label = PHOTO_CATEGORIES.find((c) => c.category === category)!.label;
      return {
        ok: true,
        proposed: { sourceUrl, category },
        preview: [`ADD photo to "${label}": ${sourceUrl}`],
        warnings: category === "COVER" || category === "PROFILE" ? ["Google decides for itself which photo it shows as the cover, so this may not become the main image."] : [],
      };
    },
    async apply(p, g, memberId, note) {
      return writeMediaFromUrl({
        token: g.token, accountName: g.accountName!, locationName: g.locationName,
        sourceUrl: p.sourceUrl, category: p.category, memberId, note,
      });
    },
  },

  photo_remove: {
    needsAccount: true,
    async prepare(input, g) {
      const mediaName = resourceUnderLocation({
        raw: input.photo_id, accountName: g.accountName!, locationName: g.locationName, collection: "media",
      });
      if (!mediaName) return { ok: false, message: "That photo id is not on this owner's listing. Use an id from my_photos." };
      const item = await gget(`${V4}/${mediaName}`, g.token);
      if (!item) return { ok: false, message: "Google could not find that photo. It may already be gone." };
      return {
        ok: true,
        proposed: { mediaName },
        preview: [
          `DELETE photo (${item.locationAssociation?.category || "uncategorised"}, added ${String(item.createTime || "").slice(0, 10) || "unknown date"}): ${item.googleUrl || mediaName}`,
        ],
      };
    },
    async apply(p, g, memberId) {
      return deleteMedia({ token: g.token, mediaName: p.mediaName, locationName: g.locationName, memberId });
    },
  },
};

function toHolidayDecisions(raw: unknown): { list: HolidayDecision[] } | { message: string } {
  if (!Array.isArray(raw) || !raw.length) return { message: "Give at least one date." };
  const today = new Date().toISOString().slice(0, 10);
  const list: HolidayDecision[] = [];
  for (const r of raw as any[]) {
    if (!isIsoDate(r?.date)) return { message: `"${String(r?.date ?? "")}" is not a date in YYYY-MM-DD form.` };
    if (r.date < today) return { message: `${r.date} has already passed.` };
    const mode = String(r.mode || (r.closed ? "closed" : r.open ? "hours" : "")).toLowerCase();
    if (mode === "closed" || mode === "clear") { list.push({ date: r.date, mode }); continue; }
    if (mode !== "hours") return { message: `${r.date}: say "closed", "clear", or give open and close times.` };
    const openTime = normaliseTime(r.open);
    const closeTime = normaliseTime(r.close);
    if (!openTime || !closeTime) return { message: `${r.date}: give open and close times like "10:00am" and "3:00pm".` };
    list.push({ date: r.date, mode: "hours", openTime, closeTime });
  }
  return { list };
}

async function planServices(input: Record<string, any>, g: OwnerGbp) {
  const add: string[] = (Array.isArray(input.add_service_ids) ? input.add_service_ids : []).map(String);
  const remove: string[] = (Array.isArray(input.remove_service_ids) ? input.remove_service_ids : []).map(String);
  const custom: string[] = (Array.isArray(input.add_custom) ? input.add_custom : []).map((s: unknown) => String(s).trim()).filter(Boolean);
  if (!add.length && !remove.length && !custom.length) {
    return { ok: false as const, message: "Nothing to add or remove." };
  }
  if (custom.some((c) => c.length > 140)) return { ok: false as const, message: "A custom service name is limited to 140 characters." };

  const loc = await readLocationFields(g.token, g.locationName, "categories,serviceItems").catch(() => null);
  if (!loc) return { ok: false as const, message: "Could not read this listing's services from Google." };
  const cats = [loc.categories?.primaryCategory, ...(loc.categories?.additionalCategories || [])].filter(Boolean) as Category[];
  const catalogue = await fetchServiceTypes(g.token, cats);
  const catalogueIds = new Set(catalogue.map((s) => s.serviceTypeId));
  const names = new Map(catalogue.map((s) => [s.serviceTypeId, s.displayName]));

  const unknown = [...add, ...remove].filter((id) => !catalogueIds.has(id));
  if (unknown.length) {
    return { ok: false as const, message: `Not in Google's service list for this business: ${unknown.join(", ")}. Use ids from my_service_options, or add_custom for a service Google does not list.` };
  }

  const current = loc.serviceItems || [];
  const offered = new Set(current.map((i: any) => i.structuredServiceItem?.serviceTypeId).filter(Boolean) as string[]);
  const selected = new Set([...offered].filter((id) => catalogueIds.has(id)));
  for (const id of add) selected.add(id);
  for (const id of remove) selected.delete(id);

  const merged = mergeServiceItems({ current, selectedTypeIds: [...selected], catalogueIds, newFreeForm: custom });
  return {
    ok: true as const,
    add, remove, custom, merged,
    addedLabels: [...add.filter((id) => !offered.has(id)).map((id) => names.get(id) || id), ...custom],
    removedLabels: remove.filter((id) => offered.has(id)).map((id) => names.get(id) || id),
    beforeCount: current.length,
    afterCount: merged.length,
  };
}

async function planAttributes(input: Record<string, any>, g: OwnerGbp) {
  const raw = input.answers && typeof input.answers === "object" ? input.answers : {};
  const answers: Record<string, boolean | null> = {};
  for (const [k, v] of Object.entries(raw)) {
    const name = normaliseAttributeName(k);
    if (name && (v === true || v === false)) answers[name] = v;
  }
  if (!Object.keys(answers).length) {
    return { ok: false as const, message: 'Give answers as {"attributes/<id>": true|false}, using ids from my_attribute_options.' };
  }
  const [available, current] = await Promise.all([
    fetchAvailableAttributes(g.token, g.locationName),
    readAttributes(g.token, g.locationName).catch(() => ({ attributes: [] })),
  ]);
  if (!available.length) return { ok: false as const, message: "Google returned no attribute list for this business category." };

  const q = buildQuestionnaire(available, (current as any).attributes || []);
  const all = [...q.askable, ...q.answered];
  const { attributes, rejected } = answersToAttributes(answers, new Set(all.map((x) => x.name)));
  if (!attributes.length) return { ok: false as const, message: `None of those can be set for this business: ${rejected.join(", ")}.` };

  const byName = new Map(all.map((x) => [x.name, x]));
  const lines = attributes.map((a: any) => {
    const qn = byName.get(a.name);
    const before = qn?.currentValue == null ? "not set" : qn.currentValue ? "yes" : "no";
    return `${qn?.label || a.name}: ${before} → ${a.values?.[0] ? "yes" : "no"}`;
  });
  return { ok: true as const, answers, attributes, rejected, lines };
}

// ── the three steps ─────────────────────────────────────────────────────────

export interface DraftResult {
  ok: boolean;
  text: string;
  /** The gbp_change_requests id, when a draft was created. */
  id?: string;
}

/**
 * Validate and store a draft. Nothing reaches Google.
 *
 * The text returned is written to be shown to the owner as-is: what changes,
 * any warning, how it can be undone, and the id publish needs.
 */
export async function draftChange(args: {
  memberId: string;
  keyPrefix: string;
  canPublish: boolean;
  kind: ChangeKind;
  input: Record<string, any>;
}): Promise<DraftResult> {
  const spec = SPECS[args.kind];
  const g = await resolveOwnerGbp(args.memberId, { account: spec.needsAccount });
  if (!g.ok) return { ok: false, text: g.message };

  const prepared = await spec.prepare(args.input || {}, g);
  if (!prepared.ok) return { ok: false, text: `Not drafted. ${prepared.message}` };

  const { data: row, error } = await (createAdminClient().from("gbp_change_requests") as any)
    .insert({
      community_member_id: args.memberId,
      location_name: g.locationName,
      surface: SURFACE[args.kind],
      proposed: { kind: args.kind, ...prepared.proposed, preview: prepared.preview },
      origin: `claude:${args.keyPrefix}`,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !row) return { ok: false, text: `Could not save the draft: ${error?.message || "unknown error"}` };

  const warnings = (prepared.warnings || []).filter(Boolean);
  return {
    ok: true,
    id: row.id,
    text: [
      `DRAFT ${row.id} — ${KIND_LABEL[args.kind]}. NOT published; nothing on Google has changed.`,
      "",
      ...prepared.preview,
      ...(warnings.length ? ["", "WARNINGS:", ...warnings.map((w) => `- ${w}`)] : []),
      "",
      UNDO_NOTE[args.kind],
      "",
      args.canPublish
        ? `Show the owner exactly what is above and ask them to confirm. Only after they agree, call publish_change with change_id "${row.id}". It expires in ${DRAFT_TTL_HOURS} hours.`
        : `This connection can draft but was not given permission to publish. To publish from Claude, the owner creates a new connection with publishing turned on at ${SITE}/account/claude.`,
    ].join("\n"),
  };
}

/**
 * Publish one pending draft.
 *
 * The claim is atomic — pending → approved in one conditional update — so two
 * calls racing on the same id publish it once. Everything after that is
 * recorded on the row whether it succeeds or not.
 */
export async function publishChange(args: {
  memberId: string;
  /** The connection that asked; absent when the owner clicked Publish on the website. */
  keyPrefix?: string;
  changeId: string;
}): Promise<DraftResult> {
  const admin = createAdminClient();
  const id = String(args.changeId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, text: "That is not a change id. Ids come from a propose_ tool or my_changes." };

  const { data: row } = await (admin.from("gbp_change_requests") as any)
    .select("id, status, location_name, proposed, created_at, origin")
    .eq("id", id)
    .eq("community_member_id", args.memberId)
    .maybeSingle();

  if (!row) return { ok: false, text: "No change with that id on this account." };
  if (row.status !== "pending") return { ok: false, text: `That change is already ${row.status}. Nothing was done.` };

  const kind = row.proposed?.kind as ChangeKind;
  const spec = SPECS[kind];
  if (!spec) return { ok: false, text: "That change was not drafted from Claude and cannot be published from here." };

  const ageHours = (Date.now() - new Date(row.created_at).getTime()) / 3_600_000;
  if (ageHours > DRAFT_TTL_HOURS) {
    await (admin.from("gbp_change_requests") as any).update({ status: "rejected", error: "expired" }).eq("id", id).eq("status", "pending");
    return { ok: false, text: `That draft is ${Math.floor(ageHours)} hours old and has expired. Draft it again so it is checked against the listing as it is now.` };
  }

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await (admin.from("gbp_change_requests") as any)
    .select("id", { count: "exact", head: true })
    .eq("community_member_id", args.memberId)
    .like("origin", "claude:%")
    .in("status", ["approved", "applied", "failed", "reverted"])
    .gte("approved_at", since);
  if ((count ?? 0) >= DAILY_PUBLISH_CAP) {
    return { ok: false, text: `This account has published ${count} changes from Claude in the last 24 hours, which is the daily limit. It resets on a rolling basis.` };
  }

  const g = await resolveOwnerGbp(args.memberId, { account: spec.needsAccount });
  if (!g.ok) return { ok: false, text: g.message };
  if (g.locationName !== row.location_name) {
    return { ok: false, text: "The owner has switched which Google location is connected since this was drafted. Draft it again." };
  }

  const { data: claimed } = await (admin.from("gbp_change_requests") as any)
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (!claimed?.length) return { ok: false, text: "That change was published or discarded a moment ago. Nothing was done." };

  const note = `${args.keyPrefix ? `claude ${args.keyPrefix}` : "owner on website"} — ${KIND_LABEL[kind]}`;
  let applied: Applied;
  try {
    applied = await spec.apply(row.proposed, g, args.memberId, note);
  } catch (e: any) {
    applied = { ok: false, error: e?.message || "unknown error" };
  }

  await (admin.from("gbp_change_requests") as any)
    .update(
      applied.ok
        ? { status: "applied", applied_at: new Date().toISOString(), snapshot_id: applied.snapshotId ?? null, proposed: { ...row.proposed, result: applied.after ?? null } }
        : { status: "failed", error: applied.error ?? "unknown", snapshot_id: applied.snapshotId ?? null }
    )
    .eq("id", id);

  if (!applied.ok) {
    return { ok: false, text: `Google refused the change: ${applied.error}\n\nNothing was changed. The draft is marked failed; fix the problem and draft it again.` };
  }

  void notifyOwner(args.memberId, kind, row.proposed?.preview || [], id, args.keyPrefix ?? null).catch((e) =>
    console.error("[gbp-changes] owner notification failed:", e)
  );

  return {
    ok: true,
    text: [
      `PUBLISHED ${id} — ${KIND_LABEL[kind]}.`,
      ...(applied.result || []),
      "",
      "Google can take a few minutes to show a change, and occasionally holds one for its own review.",
      UNDO_NOTE[kind],
      `The owner has been emailed a record of this change, and can also review or undo it at ${SITE}/account/changes.`,
    ].join("\n"),
  };
}

export async function discardChange(args: { memberId: string; changeId: string }): Promise<DraftResult> {
  const { data } = await (createAdminClient().from("gbp_change_requests") as any)
    .update({ status: "rejected", error: "discarded by owner" })
    .eq("id", String(args.changeId || ""))
    .eq("community_member_id", args.memberId)
    .eq("status", "pending")
    .select("id");
  return data?.length
    ? { ok: true, text: "Discarded. Nothing was sent to Google." }
    : { ok: false, text: "No pending draft with that id on this account." };
}

/**
 * Undo a published change from its snapshot.
 *
 * Only for changes made from Claude, and only where the write layer can
 * genuinely reverse the surface — the rest say so rather than half-undoing.
 */
export async function undoChange(args: { memberId: string; changeId: string }): Promise<DraftResult> {
  const admin = createAdminClient();
  const { data: row } = await (admin.from("gbp_change_requests") as any)
    .select("id, status, surface, proposed, snapshot_id, location_name")
    .eq("id", String(args.changeId || ""))
    .eq("community_member_id", args.memberId)
    .maybeSingle();

  if (!row) return { ok: false, text: "No change with that id on this account." };
  if (row.status === "reverted") return { ok: false, text: "That change has already been undone." };
  if (row.status !== "applied") return { ok: false, text: `That change is ${row.status}, not published, so there is nothing to undo.` };

  // Website rows carry no kind; it is derived from the surface they wrote to,
  // so a change saved on the site can be undone from the history page too.
  const kind = kindOf(row) as ChangeKind | null;
  if (!kind) return { ok: false, text: "That change has no undo recorded, so it cannot be reversed from here." };
  if (kind === "booking_link" || kind === "photo_remove") return { ok: false, text: UNDO_NOTE[kind] };

  const g = await resolveOwnerGbp(args.memberId);
  if (!g.ok) return { ok: false, text: g.message };

  let res: WriteResult;
  if (kind === "post" && row.proposed?.publishAt) {
    const postId = row.proposed?.result?.scheduledPostId;
    const { data } = await (admin.from("gbp_scheduled_posts") as any)
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", postId).eq("community_member_id", args.memberId).eq("status", "pending")
      .select("id");
    res = data?.length ? { ok: true } : { ok: false, error: "the scheduled post has already gone out, so it has to be deleted as a live post — ask again after it publishes" };
  } else if (!row.snapshot_id) {
    return { ok: false, text: "No undo point was recorded for that change, so it cannot be reversed from here." };
  } else if (kind === "attributes") {
    const r = await revertAttributes({ token: g.token, snapshotId: row.snapshot_id });
    res = r;
    if (r.ok && r.couldNotClear?.length) {
      await markReverted(row.id);
      return { ok: true, text: `Undone, except these were blank before and Google's API cannot blank them again: ${r.couldNotClear.join(", ")}. The owner can clear those in Google's own interface.` };
    }
  } else if (kind === "review_reply") {
    res = await revertReviewReply({ token: g.token, snapshotId: row.snapshot_id });
  } else if (kind === "post") {
    res = await deleteLocalPost({ token: g.token, snapshotId: row.snapshot_id });
  } else if (kind === "photo_add") {
    // Claude rows keep Google's response; website rows only have the snapshot.
    let mediaName: string | null = row.proposed?.result?.name ?? null;
    if (!mediaName) {
      const { data: snap } = await (admin.from("gbp_write_snapshots") as any)
        .select("after_state").eq("id", row.snapshot_id).maybeSingle();
      mediaName = snap?.after_state?.mediaName ?? null;
    }
    if (!mediaName) return { ok: false, text: "Google did not report which photo was created, so it cannot be removed from here." };
    res = await deleteMedia({ token: g.token, mediaName, locationName: g.locationName, memberId: args.memberId });
  } else {
    res = await revertLocationFields({ token: g.token, snapshotId: row.snapshot_id });
  }

  if (!res.ok) return { ok: false, text: `Could not undo: ${res.error}` };
  await markReverted(row.id);
  return { ok: true, text: `Undone — the ${KIND_LABEL[kind]} is back to what it was before change ${row.id}. Google can take a few minutes to show it.` };
}

async function markReverted(id: string) {
  await (createAdminClient().from("gbp_change_requests") as any).update({ status: "reverted" }).eq("id", id);
}

export async function listChanges(memberId: string, limit = 15): Promise<string> {
  const { data } = await (createAdminClient().from("gbp_change_requests") as any)
    .select("id, status, surface, proposed, origin, created_at, applied_at, error")
    .eq("community_member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));

  if (!data?.length) return "No changes have been drafted or made on this account yet.";
  return [
    `RECENT CHANGES (newest first). Pending drafts can be published or discarded; most published ones can be undone. The owner sees the same list, with buttons, at ${SITE}/account/changes.`,
    "",
    ...data.map((r: any) => {
      const kind = kindOf(r) as ChangeKind | null;
      const what = kind ? KIND_LABEL[kind] : r.surface;
      const where = String(r.origin || "").startsWith("claude:") ? "from Claude" : "on the website";
      const first = describeChange(r)[0] || "";
      return `- ${r.id} · ${String(r.status).toUpperCase()} · ${what} (${where}) · ${String(r.created_at).slice(0, 16).replace("T", " ")}${first ? `\n    ${String(first).slice(0, 160)}` : ""}${r.error ? `\n    error: ${String(r.error).slice(0, 160)}` : ""}`;
    }),
  ].join("\n");
}

/**
 * The owner's record of what was published in their name.
 *
 * This is the protection that matters most for a key living in a URL: if the
 * URL leaks, the first published change tells the owner, and the email says
 * how to stop it.
 */
async function notifyOwner(memberId: string, kind: ChangeKind, preview: string[], id: string, keyPrefix: string | null) {
  const { data: member } = await (createAdminClient().from("community_members") as any)
    .select("email, first_name")
    .eq("id", memberId)
    .maybeSingle();
  if (!member?.email) return;

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  await sendGhlEmail({
    email: member.email,
    name: member.first_name || undefined,
    subject: `Published to your Google profile: ${KIND_LABEL[kind]}`,
    html: [
      `<p>Hi ${esc(member.first_name || "there")},</p>`,
      keyPrefix
        ? `<p>Your Claude connection (<code>${esc(keyPrefix)}…</code>) just published this change to your Google Business Profile:</p>`
        : `<p>You just published this change to your Google Business Profile from ShearQuery:</p>`,
      `<pre style="white-space:pre-wrap;font-family:inherit;background:#f6f6f6;padding:12px;border-radius:8px">${esc(preview.join("\n"))}</pre>`,
      // The link is the point of the change-history page: an owner reading this
      // on their phone can undo without opening Claude — and without trusting
      // the connection that made the change, if it was not them.
      `<p><a href="${SITE}/account/changes#${esc(id)}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:8px;font-weight:700;text-decoration:none">Review or undo this change</a></p>`,
      keyPrefix
        ? `<p>If you did not ask for this, undo it from that page and revoke the connection there too. Revoking stops it working immediately.</p>`
        : "",
    ].join("\n"),
  });
}
