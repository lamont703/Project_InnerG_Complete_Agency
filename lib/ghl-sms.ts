import "server-only";
import { normalizePhone } from "./ghl-contacts";

/**
 * Transactional SMS through GoHighLevel.
 *
 * The same rails as lib/ghl-email.ts, and for the same reason: every entity is
 * already a GHL contact (5,377 of them), so a business can be messaged by
 * contact id without a lookup. app/api/send-otp/route.ts does this inline; the
 * logic is lifted here so the booking notifier does not become a second copy.
 *
 * WHY SMS IS THE ONLY CHANNEL TO A BUSINESS. Email is not an option: 31
 * addresses exist across 5,457 shops, salons and schools. Phone coverage is
 * 98–99%. So the business gets a text and the customer gets the email.
 *
 * THE FAILURE MODE THAT MATTERS. A text to a LANDLINE does not error — GHL
 * accepts it, the carrier drops it, and nothing reaches anyone. Many of these
 * numbers came from Google Places and are landlines. So a resolved promise
 * here means "GHL accepted it", NOT "someone received it", and the caller must
 * not tell a customer their request was delivered on the strength of it.
 */

const GHL_API_BASE = "https://services.leadconnectorhq.com";

export interface GhlSmsResult {
  ok: boolean;
  error?: string;
  contactId?: string;
  /** True when credentials are absent — a configuration gap, not a send failure. */
  skipped?: boolean;
}

export async function sendGhlSms(args: {
  message: string;
  /** Preferred: entities already carry their GHL contact id in contact_id. */
  contactId?: string | null;
  /** Fallback when there is no contact id — the contact is upserted by phone. */
  phone?: string | null;
  /** Used only when a contact has to be created. */
  name?: string | null;
}): Promise<GhlSmsResult> {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) {
    return { ok: false, skipped: true, error: "GHL_API_KEY / GHL_LOCATION_ID are not set." };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };

  let contactId = args.contactId || undefined;

  if (!contactId) {
    const phone = normalizePhone(args.phone);
    if (!phone) return { ok: false, error: "no contact id and no usable phone" };

    try {
      const res = await fetch(`${GHL_API_BASE}/contacts/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone, name: args.name || phone, locationId }),
      });
      const body = await res.json().catch(() => ({}));
      contactId = body.contact?.id;

      if (!res.ok) {
        // Already a contact — the duplicate error carries the existing id.
        if (res.status === 400 && String(body.message || "").includes("duplicated")) {
          contactId = body.meta?.contactId;
        } else {
          return { ok: false, error: `contact upsert failed: ${body.message || res.status}` };
        }
      }
    } catch (e: any) {
      return { ok: false, error: `contact upsert threw: ${e?.message}` };
    }
  }

  if (!contactId) return { ok: false, error: "no contact id returned" };

  try {
    const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "SMS", contactId, message: args.message }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: `send failed: ${body.message || res.status}`, contactId };
    }
    return { ok: true, contactId };
  } catch (e: any) {
    return { ok: false, error: `send threw: ${e?.message}`, contactId };
  }
}
