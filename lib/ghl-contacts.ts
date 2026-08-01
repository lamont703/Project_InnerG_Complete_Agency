import "server-only";

/**
 * Push a person into GoHighLevel as a contact.
 *
 * The directory's entities have been synced to GHL for a while
 * (scripts/sync_entities_to_ghl.js), but the people who actually raise their
 * hand — community members — were not, so every signup was a lead nobody could
 * follow up. This is the runtime equivalent of that script for a single person.
 *
 * TWO CALLS, NOT ONE, AND DELIBERATELY SO. GHL's POST /contacts/upsert
 * REPLACES a contact's tags rather than appending to them — the same behaviour
 * that scripts/reconcile_ghl_tags.js exists to clean up after. A member signing
 * up is very often already in GHL as a directory entity (that is the whole
 * point of the directory), so sending tags on the upsert would silently wipe
 * "Table: agent_barber_leads", their city, their type. Instead:
 *
 *   1. upsert with NO tags field   → cannot replace what it never sends
 *   2. POST /contacts/{id}/tags    → additive
 *
 * If step 2 fails the contact still exists and merely lacks our tags, which is
 * the right direction for this to fail in.
 */

const GHL_API_BASE = "https://services.leadconnectorhq.com";

/** Signup must not hang on a slow CRM. */
const TIMEOUT_MS = 6000;

export interface GhlContactResult {
  ok: boolean;
  contactId?: string;
  /** True when GHL created the contact rather than matching an existing one. */
  isNew?: boolean;
  /** False when the contact exists but our tags didn't make it on. */
  tagged?: boolean;
  error?: string;
  /** Set when credentials are absent — not an error, just nothing to do. */
  skipped?: boolean;
}

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };
}

/**
 * Normalize to E.164 US where possible; null if unusable.
 *
 * GHL rejects the ENTIRE upsert with "Invalid country calling code" on a
 * malformed number, so a number we can't confidently normalize has to be
 * dropped rather than passed through as a best guess — losing the phone on one
 * contact beats losing the contact. Mirrors normPhone() in
 * scripts/sync_entities_to_ghl.js; keep the two in step.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = String(raw).trim();

  // An explicit "+" is a stated country code, so it must be checked BEFORE the
  // bare-10-digit rule — otherwise "+0123456789" strips to ten digits, hits the
  // US branch and comes back "+10123456789", inventing a country code the
  // caller never wrote. scripts/sync_entities_to_ghl.js has the older ordering
  // and this bug; it's harmless there only because those numbers come from
  // Google rather than a text box.
  if (t.startsWith("+")) {
    const dd = t.replace(/[^\d]/g, "");
    return /^[1-9]\d{7,14}$/.test(dd) ? `+${dd}` : null;
  }

  const d = t.replace(/[^\d]/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === "1") return `+${d}`;
  return /^[1-9]\d{9,14}$/.test(d) ? `+${d}` : null;
}

/**
 * Whether this is an internal test account rather than a real person.
 *
 * Test signups reach the same code path as real ones, and a CRM full of fake
 * contacts is worse than one missing a few: they get counted, emailed, and
 * followed up. Kept deliberately narrow — only addresses and numbers that
 * cannot belong to a customer — because a false positive here silently drops a
 * genuine lead, which is the more expensive mistake.
 *
 * 555-01xx is the reserved fictional range; 555-5555 is the placeholder people
 * actually type.
 */
export function isTestContact(input: { email?: string | null; phone?: string | null }): boolean {
  const email = (input.email || "").trim().toLowerCase();
  const digits = (input.phone || "").replace(/[^\d]/g, "");

  if (/@(testuser\.com|example\.(com|org|net)|test\.com|mailinator\.com)$/.test(email)) return true;
  if (/^(test|testing|dummy|fake)[+@]/.test(email)) return true;

  const local = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (local.length === 10 && local.slice(3) === "5555555") return true; // 555-5555
  if (local.length === 10 && /^55501\d\d$/.test(local.slice(3))) return true; // 555-01xx

  return false;
}

/** The tags a community member carries in GHL. */
export function memberTags(opts: {
  claimedEntityType?: string | null;
  claimLinked?: boolean;
  connectedGoogle?: boolean;
}): string[] {
  return [
    "Community Member",
    "Table: community_members",
    opts.claimLinked && opts.claimedEntityType ? `Claimed: ${opts.claimedEntityType}` : null,
    opts.connectedGoogle ? "Google Connected" : null,
  ].filter(Boolean) as string[];
}

async function ghlFetch(url: string, init: RequestInit, attempts = 3): Promise<Response | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
      // Rate limits and GHL's own 5xx are worth one more try; anything else is
      // a real answer and retrying just delays the signup.
      if (res.status === 429 || res.status >= 500) {
        if (attempt < attempts - 1) {
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
      }
      return res;
    } catch {
      if (attempt === attempts - 1) return null;
    }
  }
  return null;
}

/**
 * Tag a community member by their member id.
 *
 * Handles the member whose signup predates the CRM sync, or whose sync failed:
 * with no contact_id there is nothing to tag, so this creates the contact
 * first and records the id. Otherwise the members most worth chasing — the
 * early ones — would be the only ones a workflow could never see.
 *
 * Never throws. Returns quietly for a member who cannot be identified.
 */
export async function tagCommunityMember(memberId: string, tags: string[]): Promise<GhlContactResult> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { data: member } = await (admin as any)
      .from("community_members")
      .select("id, first_name, last_name, email, phone, contact_id")
      .eq("id", memberId)
      .maybeSingle();

    if (!member) return { ok: false, error: `no member ${memberId}` };
    if (isTestContact({ email: member.email, phone: member.phone })) {
      return { ok: false, skipped: true, error: "test account — not tagged" };
    }

    if (member.contact_id) return await addGhlTags(member.contact_id, tags);

    const created = await upsertGhlContact({
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      phone: member.phone,
      source: "Community Signup",
      tags: [...memberTags({}), ...tags],
    });

    if (created.ok && created.contactId) {
      await (admin.from("community_members") as any)
        .update({ contact_id: created.contactId, contact_synced_at: new Date().toISOString() })
        .eq("id", memberId);
    }
    return created;
  } catch (e: any) {
    return { ok: false, error: e?.message || "tagCommunityMember threw" };
  }
}

/**
 * Tags marking what a member has actually done.
 *
 * These exist because GoHighLevel can only branch a workflow on what it knows
 * about a contact, and "ran an audit" / "connected Google" are facts that live
 * in our database, not theirs. Writing them as tags is what lets an onboarding
 * sequence stop chasing someone who has already done the thing.
 *
 * Values are frozen: a workflow in GHL references these strings literally, and
 * renaming one here silently breaks a branch nobody can see from this repo —
 * the workflow API exposes a workflow's name and status but not its steps.
 */
export const TAG_AUDIT_RUN = "audit: run";
export const TAG_GOOGLE_CONNECTED = "google: connected";

/**
 * Add tags to a contact we already know the id of.
 *
 * Additive by construction — this is the endpoint that appends, unlike the
 * upsert, which replaces. Never throws: a tag is an annotation, and losing one
 * must not fail the thing the member actually came to do.
 */
export async function addGhlTags(contactId: string, tags: string[]): Promise<GhlContactResult> {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) return { ok: false, skipped: true, error: "GHL_API_KEY not set" };
  if (!contactId || tags.length === 0) return { ok: false, error: "nothing to tag" };

  const res = await ghlFetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({ tags }),
  });

  if (!res) return { ok: false, contactId, error: "GHL unreachable (timeout)" };
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, contactId, error: `${res.status} ${text.slice(0, 200)}` };
  }
  return { ok: true, contactId, tagged: true };
}

/**
 * Create or update a GHL contact, then apply tags additively.
 *
 * NEVER THROWS. A CRM that is down, rate-limiting, or misconfigured must not
 * cost someone their membership — the caller has already written the row that
 * matters. Every failure comes back as { ok: false, error } to be logged.
 */
export async function upsertGhlContact(input: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  tags?: string[];
  /** Shows in GHL's "Source" column; how you tell signups from bulk sync. */
  source?: string;
}): Promise<GhlContactResult> {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    return { ok: false, skipped: true, error: "GHL_API_KEY / GHL_LOCATION_ID not set" };
  }

  const name =
    input.name || [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || undefined;
  const phone = normalizePhone(input.phone);
  const email = input.email?.trim() || undefined;

  // GHL needs something to identify a person by; without either, the upsert
  // would create an unreachable ghost contact on every call.
  if (!email && !phone) {
    return { ok: false, error: "no email or phone to identify the contact" };
  }

  // Test accounts use the same signup route as everyone else; keep them out of
  // the CRM rather than filtering them back out later.
  if (isTestContact({ email, phone })) {
    return { ok: false, skipped: true, error: "test account — not synced" };
  }

  const body: Record<string, unknown> = {
    locationId,
    source: input.source || "Community Signup",
    ...(name ? { name } : {}),
    ...(input.firstName ? { firstName: input.firstName } : {}),
    ...(input.lastName ? { lastName: input.lastName } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    // No `tags` here — see the note at the top of this file.
  };

  const res = await ghlFetch(`${GHL_API_BASE}/contacts/upsert`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify(body),
  });

  if (!res) return { ok: false, error: "GHL unreachable (timeout)" };
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: `${res.status} ${text.slice(0, 200)}` };
  }

  const data = await res.json().catch(() => ({} as any));
  const contactId: string | undefined = data?.contact?.id;
  if (!contactId) return { ok: false, error: "upsert returned no contact id" };

  const tags = input.tags?.filter(Boolean) ?? [];
  if (tags.length === 0) return { ok: true, contactId, isNew: !!data?.new, tagged: true };

  const tagRes = await ghlFetch(`${GHL_API_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({ tags }),
  });

  return {
    ok: true,
    contactId,
    isNew: !!data?.new,
    tagged: !!tagRes?.ok,
    ...(tagRes?.ok ? {} : { error: "contact saved, tags not applied" }),
  };
}
