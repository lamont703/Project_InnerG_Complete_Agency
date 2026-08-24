/**
 * Read stored booking emails and try to make structure out of them.
 *
 *   node scripts/parse_booking_emails.js              # anything not yet parsed
 *   node scripts/parse_booking_emails.js --all        # re-read everything
 *   node scripts/parse_booking_emails.js --show       # print what was found, write nothing
 *   node scripts/parse_booking_emails.js --limit 5
 *   node scripts/parse_booking_emails.js --raw     # dump what GHL actually sent
 *
 * SEPARATE FROM INTAKE ON PURPOSE. The webhook stores and nothing more, so this
 * can be run again and again over the same messages while the prompt is tuned.
 * Parsing on receipt would mean every prompt change needed a fresh batch of real
 * appointments — days per iteration, for a question that should take minutes.
 *
 * IT DOES NOT IMPOSE A SCHEMA, and that is the whole point of this phase. The
 * model is asked to report what it FINDS rather than fill in a form, and to say
 * plainly what was absent. A fixed schema at this stage would quietly coerce
 * every email into the shape of whichever one was read first, and the fields
 * that never appear would be indistinguishable from fields that appear as null.
 * Once the same keys show up across fifty messages, THAT is the schema — and it
 * will have been discovered rather than assumed.
 *
 * Bump PARSE_VERSION whenever the prompt changes, so a row's parse can be traced
 * to what produced it and older ones re-read selectively.
 */

require("dotenv").config({ path: ".env.local" });

const PARSE_VERSION = 1;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
/*
 * GEMINI_API_KEY ONLY — never the chat key, even as a fallback.
 *
 * Google rate-limits PER PROJECT, not per key, so a key is not a quota: the
 * Cloud project behind it is. lib/gemini-keys.ts exists because a batch script
 * run from a laptop once consumed the live chat's allowance and took it down
 * with a 429 nobody could see. This is exactly such a script, so falling back
 * to GEMINI_CHAT_API_KEY when the scripts project is exhausted would recreate
 * that outage on purpose.
 *
 * A 429 here means the SCRIPTS project is out of quota. That is information,
 * not an obstacle to route around.
 */
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const args = process.argv.slice(2);
const ALL = args.includes("--all");
const SHOW_ONLY = args.includes("--show");
const RAW = args.includes("--raw");
const LIMIT = Number(args[args.indexOf("--limit") + 1]) || 25;

const PROMPT = `You are reading ONE email that a barbershop or salon received from its
online booking platform (Booksy, Square, Vagaro, Fresha, Boulevard, Acuity, or similar).

Report what this email actually contains. Do NOT invent, infer or fill gaps.

Return ONLY a JSON object with two top-level keys:

"found": an object holding every piece of concrete information present, using
whatever key names honestly describe it. Things worth capturing if they appear:
the platform's name; what kind of notification this is (new booking, reminder,
reschedule, cancellation, no-show, review request, payout, something else); the
client's name, email, phone; the appointment date and time and timezone; the
service name; duration; price; the staff member; the location; any booking or
appointment reference number; and any ACTION LINKS with their URL and what each
one does (cancel, reschedule, confirm, view booking).

"absent": an array naming the things above that are NOT in this email. Being
explicit about what is missing is as useful as what is present — a field that
never appears must be distinguishable from one that appears empty.

Return nothing but the JSON object.

EMAIL
Subject: {{SUBJECT}}
From: {{FROM}}

{{BODY}}`;

async function gemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 2000, responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini returned no content");
  return JSON.parse(text);
}

/** HTML-only mails are common; strip tags rather than skip the message. */
function bodyOf(row) {
  if (row.text_body) return row.text_body;
  if (!row.html_body) return "";
  return row.html_body
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    // Keep hrefs — the action links are the most valuable thing in here, and
    // stripping tags naively throws them away.
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, " $2 [$1] ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

(async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) return console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  if (!GEMINI_KEY) return console.error("Missing GEMINI_API_KEY (do NOT substitute GEMINI_CHAT_API_KEY — see the note above)");

  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
  const filter = ALL ? "" : `&or=(parse_version.is.null,parse_version.lt.${PARSE_VERSION})`;
  const rows = await fetch(
    `${SUPABASE_URL}/rest/v1/booking_emails?select=*&order=received_at.asc&limit=${LIMIT}${filter}`,
    { headers }
  ).then((r) => r.json());

  /*
   * "No rows" and "the query failed" are different answers and must not print
   * the same sentence. PostgREST returns an object with a message on error, so
   * a non-array here means the table is missing or unreadable — most often the
   * migration has not been applied — and reporting that as "nothing to parse"
   * would send someone looking for missing emails instead of a missing table.
   */
  if (!Array.isArray(rows)) {
    console.error("Could not read booking_emails:", JSON.stringify(rows).slice(0, 300));
    console.error("Has 20260824190000_booking_emails.sql been applied?");
    process.exit(1);
  }
  if (rows.length === 0) {
    return console.log("No emails waiting. (They arrive via the GHL workflow into booking_emails.)");
  }
  /*
   * --raw answers the question that has to be settled before anything else:
   * does GHL's inbound payload preserve the ORIGINAL recipient address? The
   * token in that address is the only thing tying an email to a shop. If it is
   * missing, every message lands unattributed and the design needs rethinking
   * before a second shop is added — so this prints the payload's real shape
   * rather than leaving it to be guessed from a parse that already assumed it.
   */
  if (RAW) {
    for (const row of rows) {
      console.log("=".repeat(70));
      console.log(`received ${row.received_at}`);
      console.log(`token extracted : ${row.token ?? "*** NONE — no recipient address in the payload ***"}`);
      console.log(`to_address      : ${row.to_address ?? "(not found)"}`);
      console.log(`from_address    : ${row.from_address ?? "(not found)"}`);
      console.log(`subject         : ${row.subject ?? "(not found)"}`);
      console.log(`text_body       : ${row.text_body ? row.text_body.length + " chars" : "(none)"}`);
      console.log(`html_body       : ${row.html_body ? row.html_body.length + " chars" : "(none)"}`);
      console.log("\nraw payload keys and values:");
      console.log(JSON.stringify(row.raw, null, 2).slice(0, 4000));
      console.log("");
    }
    return;
  }

  console.log(`\nParsing ${rows.length} email(s) at prompt version ${PARSE_VERSION}\n`);

  for (const row of rows) {
    const body = bodyOf(row);
    const label = `${(row.subject || "(no subject)").slice(0, 60)}  ←  ${row.from_address || "?"}`;
    if (!body) { console.log(`— ${label}\n   SKIPPED: no body at all\n`); continue; }

    const prompt = PROMPT
      .replace("{{SUBJECT}}", row.subject || "")
      .replace("{{FROM}}", row.from_address || "")
      .replace("{{BODY}}", body.slice(0, 20000));

    let parsed = null, error = null;
    try { parsed = await gemini(prompt); }
    catch (e) {
      error = String(e.message || e).slice(0, 400);
      if (error.includes("429")) {
        console.log(`— ${label}`);
        console.log("   QUOTA EXHAUSTED on the scripts Gemini project.");
        console.log("   Wait for the daily reset or raise the limit. Do not point this at");
        console.log("   GEMINI_CHAT_API_KEY — that is the live chat's project.\n");
        break;
      }
    }

    console.log(`— ${label}`);
    if (error) console.log(`   ERROR: ${error}`);
    else {
      console.log("   found:", JSON.stringify(parsed.found ?? parsed, null, 2).split("\n").join("\n   "));
      if (parsed.absent?.length) console.log(`   absent: ${parsed.absent.join(", ")}`);
    }
    console.log("");

    if (SHOW_ONLY) continue;
    await fetch(`${SUPABASE_URL}/rest/v1/booking_emails?id=eq.${row.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        parsed, parse_error: error, parse_version: PARSE_VERSION, parsed_at: new Date().toISOString(),
      }),
    });
  }

  console.log(SHOW_ONLY ? "Nothing written (--show).\n" : "Written back to booking_emails.parsed.\n");
})();
