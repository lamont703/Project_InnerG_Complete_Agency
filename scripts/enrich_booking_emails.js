/**
 * Fill in what GHL's webhook leaves out: the recipient, the subject, the HTML.
 *
 *   node scripts/enrich_booking_emails.js            # rows with no token yet
 *   node scripts/enrich_booking_emails.js --all      # re-enrich everything
 *   node scripts/enrich_booking_emails.js --show     # print, write nothing
 *
 * WHY THIS EXISTS AT ALL. GHL's Inbound Email trigger sends a contact-shaped
 * payload — sender, subject, plain-text body — and no recipient address. That
 * address carries the per-shop token, so without it an email cannot be
 * attributed to anyone. Three rounds of workflow custom-values failed to
 * surface it, including an AI extraction step that could not have worked: the
 * recipient was never in the data it was given.
 *
 * GHL DOES HOLD IT, two hops down, and the middle hop is the part that is not
 * obvious:
 *
 *   1. the webhook gives customData.message_id      (a CONVERSATION message id)
 *   2. GET /conversations/messages/{id}
 *        -> meta.email.messageIds[0]                (a DIFFERENT, email id)
 *   3. GET /conversations/messages/email/{emailId}
 *        -> to[], from, subject, and the HTML body
 *
 * Without step 2 it looks like GHL simply does not keep the recipient.
 *
 * SEPARATE FROM THE WEBHOOK ON PURPOSE. Two API calls inline would slow the
 * response, and GHL retries a slow webhook — which is how one email becomes
 * three rows. The webhook stores and returns; this fills in the rest, and can
 * be re-run over anything it failed on before.
 *
 * THE HTML MATTERS AS MUCH AS THE TOKEN. The webhook only ever receives plain
 * text, and the cancel and reschedule links live in the markup. Those links are
 * the difference between reporting on appointments and being able to act on
 * one.
 */

require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GHL_KEY = process.env.GHL_API_KEY;
const GHL = "https://services.leadconnectorhq.com";

const args = process.argv.slice(2);
const ALL = args.includes("--all");
const SHOW_ONLY = args.includes("--show");

const ghlHeaders = {
  Authorization: `Bearer ${GHL_KEY}`,
  Version: "2021-04-15",
  Accept: "application/json",
};

/**
 * The conversation-message id, from wherever it landed.
 *
 * Keys are trimmed because they are typed by hand into a GHL form and the first
 * probe arrived as " message_id" with a leading space — a silent miss that
 * reads as "GHL does not expose a message id" rather than a stray keystroke.
 */
function messageIdFrom(raw) {
  const cd = raw?.customData ?? {};
  for (const [k, v] of Object.entries(cd)) {
    const key = String(k).trim().toLowerCase();
    if ((key === "message_id" || key === "messageid") && typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }
  return null;
}

async function ghlJson(path) {
  const res = await fetch(`${GHL}${path}`, { headers: ghlHeaders, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} ${path}: ${(await res.text()).slice(0, 160)}`);
  return res.json();
}

/** local part of bk-1dd352648e@support.shearquery.com */
function tokenFrom(address) {
  if (!address) return null;
  const m = String(address).match(/([A-Za-z0-9._%+-]+)@/);
  return m ? m[1] : null;
}

(async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) return console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  if (!GHL_KEY) return console.error("Missing GHL_API_KEY");

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
  const filter = ALL ? "" : "&token=is.null";
  const rows = await fetch(
    `${SUPABASE_URL}/rest/v1/booking_emails?select=id,received_at,raw,token,subject&order=received_at.asc${filter}`,
    { headers }
  ).then((r) => r.json());

  if (!Array.isArray(rows)) {
    console.error("Could not read booking_emails:", JSON.stringify(rows).slice(0, 300));
    process.exit(1);
  }
  if (rows.length === 0) return console.log("Nothing to enrich.");

  console.log(`\nEnriching ${rows.length} email(s) via GHL\n`);
  let done = 0, failed = 0;

  for (const row of rows) {
    const convMessageId = messageIdFrom(row.raw);
    if (!convMessageId) {
      console.log(`— ${row.received_at.slice(0, 19)}  SKIP: no message_id in customData`);
      console.log(`   (add a custom value  message_id = the workflow's message id  to the GHL webhook)`);
      failed++;
      continue;
    }

    try {
      // Hop 1 -> the conversation message, which carries the EMAIL message id.
      const conv = await ghlJson(`/conversations/messages/${convMessageId}`);
      const emailId = conv?.message?.meta?.email?.messageIds?.[0] ?? conv?.meta?.email?.messageIds?.[0];
      if (!emailId) throw new Error("no meta.email.messageIds — not an email message?");

      // Hop 2 -> the email itself, which finally has the recipient.
      const em = await ghlJson(`/conversations/messages/email/${emailId}`);
      const mail = em?.emailMessage ?? em?.message ?? em;

      // `to` is an ARRAY. Taking [0] is right for our case — one token address
      // per shop — but if a shop ever CCs us the token may not be first, so
      // prefer whichever recipient actually looks like one of ours.
      const recipients = Array.isArray(mail?.to) ? mail.to : [mail?.to].filter(Boolean);
      const ours = recipients.find((a) => /@support\.shearquery\.com/i.test(String(a)));
      const toAddress = ours ?? recipients[0] ?? null;
      const token = tokenFrom(toAddress);

      const patch = {
        to_address: toAddress,
        token,
        subject: mail?.subject ?? row.subject ?? null,
        from_address: mail?.from ?? null,
        html_body: typeof mail?.body === "string" ? mail.body : null,
        provider_message_id: emailId,
      };

      console.log(`— ${row.received_at.slice(0, 19)}  ${patch.subject || "(no subject)"}`);
      console.log(`   to    : ${toAddress ?? "(none)"}`);
      console.log(`   token : ${token ?? "(none)"}`);
      console.log(`   html  : ${patch.html_body ? patch.html_body.length + " chars" : "(none)"}`);

      if (!SHOW_ONLY) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/booking_emails?id=eq.${row.id}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`save failed: ${(await res.text()).slice(0, 160)}`);
      }
      done++;
    } catch (e) {
      console.log(`— ${row.received_at.slice(0, 19)}  FAILED: ${String(e.message || e).slice(0, 180)}`);
      failed++;
    }
    console.log("");
  }

  console.log(`${done} enriched, ${failed} failed.${SHOW_ONLY ? " (--show: nothing written)" : ""}\n`);
})();
