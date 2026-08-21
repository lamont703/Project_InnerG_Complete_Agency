import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/ghl-contacts";
import { shopifyGraphQL } from "@/lib/shopify";
import { CONSENT_TEXT, CONSENT_TEXT_LABEL } from "./disclosure";

/**
 * Reading and writing consent records, and pushing confirmed consent into
 * Shopify.
 *
 * Same `as any` cast as the other rebooking tables: types/database.ts predates
 * them. ConsentRecord is the real boundary.
 */

export type ConsentStatus = "invited" | "submitted" | "confirmed" | "synced" | "declined";

export interface ConsentRecord {
  id: string;
  token: string;
  shopifyCustomerId: string;
  clientName: string | null;
  email: string | null;
  phone: string | null;
  status: ConsentStatus;
  submittedAt: string | null;
  confirmedAt: string | null;
  syncedAt: string | null;
  syncError: string | null;
}

function fromRow(r: Record<string, any>): ConsentRecord {
  return {
    id: r.id,
    token: r.token,
    shopifyCustomerId: r.shopify_customer_id,
    clientName: r.client_name,
    email: r.email,
    phone: r.phone,
    status: r.status,
    submittedAt: r.submitted_at,
    confirmedAt: r.confirmed_at,
    syncedAt: r.synced_at,
    syncError: r.sync_error,
  };
}

/**
 * 32 bytes of randomness, url-safe.
 *
 * The token is the only thing standing between a forwarded email and one
 * client subscribing another client's record, so it is generated from a CSPRNG
 * rather than anything derived from the customer id.
 */
export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createInvite(input: {
  shopifyCustomerId: string;
  clientName: string | null;
  email: string | null;
}): Promise<ConsentRecord> {
  const db = createAdminClient();
  const token = newToken();
  const { data, error } = await (db.from("sms_consent_records") as any)
    .insert({
      token,
      shopify_customer_id: input.shopifyCustomerId,
      client_name: input.clientName,
      email: input.email,
      status: "invited",
    })
    .select()
    .single();
  if (error) throw new Error(`Could not create consent invite: ${error.message}`);
  return fromRow(data);
}

/**
 * The client's consent link, creating one only if they have never had one.
 *
 * REUSE IS THE WHOLE POINT. The rebooking agent and the consent campaign both
 * want to point the same person at the same page, and minting a second token
 * would leave two live links for one client — the older one going stale in an
 * inbox while the newer one is the only one that works. It also keeps the
 * campaign's "skip anyone who already has a record" rule honest: a client the
 * agent has already invited is not asked twice.
 *
 * Returns null for anyone already through the flow; there is nothing to invite
 * them to.
 */
export async function findOrCreateInvite(input: {
  shopifyCustomerId: string;
  clientName: string | null;
  email: string | null;
}): Promise<ConsentRecord | null> {
  const db = createAdminClient();
  const { data } = await (db.from("sms_consent_records") as any)
    .select("*")
    .eq("shopify_customer_id", input.shopifyCustomerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) {
    const existing = fromRow(data);
    if (existing.status === "confirmed" || existing.status === "synced" || existing.status === "declined") {
      return null;
    }
    return existing;
  }
  return createInvite(input);
}

export async function findByToken(token: string): Promise<ConsentRecord | null> {
  const db = createAdminClient();
  const { data, error } = await (db.from("sms_consent_records") as any)
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  return fromRow(data);
}

/**
 * Record the form submission — step one of two.
 *
 * Deliberately does NOT mark them consented. A number typed into a form is a
 * claim; the confirming reply is the proof. Storing the IP, user agent and the
 * exact disclosure here is what makes the record evidence rather than an
 * assertion.
 */
export async function recordSubmission(input: {
  token: string;
  phone: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<{ ok: true; record: ConsentRecord } | { ok: false; error: string }> {
  const normalized = normalizePhone(input.phone);
  if (!normalized) return { ok: false, error: "That doesn't look like a mobile number." };

  const db = createAdminClient();
  const { data, error } = await (db.from("sms_consent_records") as any)
    .update({
      phone: normalized,
      consent_text: CONSENT_TEXT,
      consent_text_label: CONSENT_TEXT_LABEL,
      submitted_at: new Date().toISOString(),
      submitted_ip: input.ip,
      submitted_user_agent: input.userAgent,
      status: "submitted",
    })
    .eq("token", input.token)
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, record: fromRow(data) };
}

export async function markConfirmationSent(token: string, error?: string): Promise<void> {
  const db = createAdminClient();
  await (db.from("sms_consent_records") as any)
    .update({
      confirmation_sent_at: new Date().toISOString(),
      confirmation_error: error ?? null,
    })
    .eq("token", token);
}

/** Find whoever we are waiting on a YES from, by the number they gave us. */
export async function findAwaitingConfirmation(phone: string): Promise<ConsentRecord | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const db = createAdminClient();
  const { data, error } = await (db.from("sms_consent_records") as any)
    .select("*")
    .eq("phone", normalized)
    .in("status", ["submitted", "confirmed"])
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return fromRow(data);
}

export async function markConfirmed(id: string): Promise<void> {
  const db = createAdminClient();
  await (db.from("sms_consent_records") as any)
    .update({ confirmed_at: new Date().toISOString(), status: "confirmed" })
    .eq("id", id);
}

export async function markDeclined(id: string): Promise<void> {
  const db = createAdminClient();
  await (db.from("sms_consent_records") as any).update({ status: "declined" }).eq("id", id);
}

/**
 * Propagate a STOP into Shopify.
 *
 * UNSUBSCRIBED, NOT NOT_SUBSCRIBED — and that is not a style choice. Shopify
 * accepts NOT_SUBSCRIBED when reading a customer and rejects it as an input:
 * "Cannot specify NOT_SUBSCRIBED as a marketing state input". The two states
 * also mean different things. NOT_SUBSCRIBED is "never said yes"; UNSUBSCRIBED
 * is "said no", which is what actually happened and the stronger record to hold
 * if the opt-out is ever questioned.
 *
 * Best-effort by design. GHL honours STOP at the carrier level the moment it
 * arrives, so a failure here leaves them genuinely un-texted and merely leaves
 * Shopify's copy stale — worth retrying, never worth blocking the reply on.
 */
export async function unsubscribeInShopify(
  shopifyCustomerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const data: any = await shopifyGraphQL(CONSENT_MUTATION, {
      input: {
        customerId: shopifyCustomerId,
        smsMarketingConsent: {
          marketingState: "UNSUBSCRIBED",
          marketingOptInLevel: "SINGLE_OPT_IN",
        },
      },
    });
    const errs = data?.customerSmsMarketingConsentUpdate?.userErrors ?? [];
    if (errs.length) return { ok: false, error: errs.map((e: any) => e.message).join("; ") };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const CONSENT_MUTATION = `
  mutation SetSmsConsent($input: CustomerSmsMarketingConsentUpdateInput!) {
    customerSmsMarketingConsentUpdate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }
`;

/**
 * Write confirmed consent into Shopify, which is the system of record.
 *
 * CONFIRMED_OPT_IN, not SINGLE_OPT_IN — they filled in a form and then replied
 * YES to a text sent to that number. Recording it as single opt-in would
 * understate what was actually collected and throw away the stronger evidence.
 *
 * Failure is expected and survivable. The row keeps confirmed_at and gains a
 * sync_error, so syncPendingConsent() can replay it later — which is exactly
 * what happens while the app is still waiting on the write_customers scope.
 */
export async function syncToShopify(
  record: ConsentRecord,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!record.confirmedAt) return { ok: false, error: "Not confirmed yet." };
  if (!record.phone) return { ok: false, error: "No phone number on the record." };

  const db = createAdminClient();
  try {
    const data: any = await shopifyGraphQL(CONSENT_MUTATION, {
      input: {
        customerId: record.shopifyCustomerId,
        smsMarketingConsent: {
          marketingState: "SUBSCRIBED",
          marketingOptInLevel: "CONFIRMED_OPT_IN",
          consentUpdatedAt: record.confirmedAt,
        },
      },
    });
    const errs = data?.customerSmsMarketingConsentUpdate?.userErrors ?? [];
    if (errs.length) {
      const msg = errs.map((e: any) => e.message).join("; ");
      await (db.from("sms_consent_records") as any).update({ sync_error: msg }).eq("id", record.id);
      return { ok: false, error: msg };
    }
    await (db.from("sms_consent_records") as any)
      .update({ synced_at: new Date().toISOString(), sync_error: null, status: "synced" })
      .eq("id", record.id);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await (db.from("sms_consent_records") as any).update({ sync_error: msg }).eq("id", record.id);
    return { ok: false, error: msg };
  }
}

/** Replay every confirmation Shopify has not accepted yet. */
export async function syncPendingConsent(): Promise<{ attempted: number; synced: number; failed: number }> {
  const db = createAdminClient();
  const { data } = await (db.from("sms_consent_records") as any)
    .select("*")
    .eq("status", "confirmed")
    .not("confirmed_at", "is", null);

  const rows = ((data ?? []) as Record<string, any>[]).map(fromRow);
  let synced = 0;
  let failed = 0;
  for (const r of rows) {
    const res = await syncToShopify(r);
    if (res.ok) synced++;
    else failed++;
  }
  return { attempted: rows.length, synced, failed };
}

export async function consentStats(): Promise<Record<ConsentStatus, number>> {
  const db = createAdminClient();
  const { data } = await (db.from("sms_consent_records") as any).select("status");
  const out: Record<string, number> = { invited: 0, submitted: 0, confirmed: 0, synced: 0, declined: 0 };
  for (const r of (data ?? []) as { status: string }[]) out[r.status] = (out[r.status] ?? 0) + 1;
  return out as Record<ConsentStatus, number>;
}
