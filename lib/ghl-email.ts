import "server-only";

/**
 * Transactional email through GoHighLevel.
 *
 * The project already sends SMS this way (app/api/send-otp), and every entity is
 * already synced into GHL as a contact, so outbound mail belongs on the same
 * rails: one set of credentials, one place to see what was sent to whom, and no
 * second sending domain to warm up or get wrong.
 *
 * Two-step by necessity — GHL messages address a contact, not an email address,
 * so an unknown recipient has to be upserted first. A duplicate upsert returns
 * 400 with the existing contact id in meta, which is a success for our purposes.
 */

const GHL_API_BASE = "https://services.leadconnectorhq.com";

export interface GhlEmailResult {
  ok: boolean;
  error?: string;
  contactId?: string;
}

export async function sendGhlEmail(args: {
  email: string;
  subject: string;
  html: string;
  /** Used when the contact has to be created. */
  name?: string;
  /**
   * Skip the lookup when the caller already holds the contact id — the signup
   * route has just upserted the contact, and creating it again only to be told
   * it is a duplicate is a wasted round trip on a path a person is waiting on.
   */
  contactId?: string;
}): Promise<GhlEmailResult> {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) {
    return { ok: false, error: "GHL_API_KEY / GHL_LOCATION_ID are not set." };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };

  let contactId: string | undefined = args.contactId;

  if (!contactId) {
    try {
      const res = await fetch(`${GHL_API_BASE}/contacts/`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email: args.email, name: args.name || args.email, locationId }),
      });
      const body = await res.json().catch(() => ({}));
      contactId = body.contact?.id;

      if (!res.ok) {
        // Already a contact — the id comes back on the duplicate error.
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
      body: JSON.stringify({
        type: "Email",
        contactId,
        subject: args.subject,
        html: args.html,
        emailTo: args.email,
      }),
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
