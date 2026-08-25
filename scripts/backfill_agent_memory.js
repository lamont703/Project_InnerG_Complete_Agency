/**
 * Import a member's prior GHL conversations into agent memory.
 *
 *   node scripts/backfill_agent_memory.js --show          # print, write nothing
 *   node scripts/backfill_agent_memory.js                 # every synced member
 *   node scripts/backfill_agent_memory.js --member <uuid>
 *   node scripts/backfill_agent_memory.js --limit 200     # messages per member
 *
 * WHY A ONE-OFF AND NOT A LIVE DEPENDENCY. The webhooks now record on receipt,
 * so this only exists to recover what happened BEFORE that. Fetching history
 * from GHL on every chat turn would put a third party in the critical path of
 * "it remembers me", and would make GHL the system of record for the one asset
 * that is supposed to be ours.
 *
 * SAFE TO RUN TWICE. Every row carries the GHL message id in external_id, and
 * the (channel, external_id) unique index turns a re-run into a pile of 23505s
 * that are counted and ignored. That matters more than it sounds: a backfill
 * nobody dares repeat is a backfill that stays half-finished.
 *
 * ONLY MEMBERS, AND ONLY UNAMBIGUOUS ONES. It walks community_members that have
 * a contact_id, so a prospect's conversation is never imported. Members sharing
 * a GHL contact — the migration's "couple sharing a mobile" — are skipped
 * rather than guessed at, the same rule the live recorder applies.
 */

require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GHL_KEY = process.env.GHL_API_KEY;
const GHL = "https://services.leadconnectorhq.com";

const args = process.argv.slice(2);
const SHOW_ONLY = args.includes("--show");
const ONE_MEMBER = args.includes("--member") ? args[args.indexOf("--member") + 1] : null;
const PER_MEMBER = Number(args[args.indexOf("--limit") + 1]) || 100;

const sb = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
const gh = { Authorization: `Bearer ${GHL_KEY}`, Version: "2021-04-15", Accept: "application/json" };

async function ghlJson(path) {
  const res = await fetch(`${GHL}${path}`, { headers: gh, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${res.status} ${path}: ${(await res.text()).slice(0, 140)}`);
  return res.json();
}

/**
 * GHL's message shape, translated.
 *
 * `direction` is the only thing that says who spoke. An outbound message is
 * ours — but 'manual' means a PERSON typed it in the GHL inbox, not the agent,
 * and recording that as 'model' would teach the agent it said things it never
 * said. That distinction is why the role check now allows 'human'.
 */
function directionOf(m) {
  return m?.meta?.email?.direction || m?.direction || (m?.source ? "outbound" : "inbound");
}

function roleOf(m) {
  if (directionOf(m) === "inbound") return "user";
  // Outbound from GHL is either a person typing in the inbox or an automation.
  // Neither is the chat agent, so neither is 'model' — calling an automated
  // drip 'model' would teach the agent it wrote marketing copy it never wrote.
  return "human";
}

/**
 * WHERE THIS TURN CAME FROM, which decides whether it is conversation at all.
 *
 * Reading the real import made the problem obvious: alongside genuine two-way
 * messages sat a marketing drip — "Most people looking for a shop like yours
 * decide on Google before they ever visit" — and product notifications like
 * "we've passed your request to Ryan Anderson Stylist". Left in memory, the
 * agent would one day say "as I mentioned, most people decide on Google", which
 * is a nurture sequence replayed as though it were a conversation. That single
 * sentence would cost more trust than the whole feature earns.
 *
 * GHL tags the sender, and that is a structural signal rather than a guess at
 * the text:
 *   workflow      an automation sent it        -> never conversation
 *   bulk_actions  a bulk send                  -> never conversation
 *   app           typed in the inbox, OR a transactional notification
 *   (none)        inbound, so the member spoke -> always conversation
 *
 * 'app' needed a second signal, and reading three members' real histories
 * supplied it: THE CHANNEL DECIDES.
 *
 *   Barber To The Stars, SMS   "Im not interested in making a profile"
 *                              "Can I talk to someone" / "Sure. I'll call now."
 *   Stephen, email             "WELCOME, STEPHEN. Your membership is active."
 *   Matthew, email             "your business has been linked to your account."
 *
 * Outbound 'app' on SMS is a person typing in the GHL inbox — real conversation.
 * Outbound 'app' on EMAIL is the product sending a receipt. Every email in that
 * bucket across three members was transactional.
 *
 * The rule is imperfect and knowingly so: a person occasionally does write an
 * email from the inbox, and that one gets filed as a notification. The error is
 * accepted because the costs are lopsided — a human email misread as a receipt
 * is a lost nuance, while a receipt misread as a human message lets the agent
 * say "as I mentioned" about a welcome email it never wrote.
 */
function sourceTag(m) {
  if (directionOf(m) === "inbound") return "ghl_inbound";
  const src = String(m?.source || "").toLowerCase();
  if (src === "workflow") return "ghl_workflow";
  if (src === "bulk_actions" || src === "campaign") return "ghl_bulk";
  return channelOf(m) === "email" ? "ghl_notification" : "ghl_app";
}

function channelOf(m) {
  const t = String(m?.messageType || "").toUpperCase();
  if (t.includes("EMAIL")) return "email";
  if (t.includes("SMS")) return "sms";
  if (t.includes("IG") || t.includes("INSTAGRAM")) return "instagram";
  return null; // calls, voicemail, anything else — not a conversation turn
}

/** HTML bodies are common on the email side; keep the words, drop the markup. */
function textOf(m) {
  const raw = m?.body || "";
  if (!raw) return "";
  return String(raw)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function threadFor(memberId) {
  const found = await fetch(
    `${SUPABASE_URL}/rest/v1/member_agent_threads?select=id&community_member_id=eq.${memberId}&order=updated_at.desc&limit=1`,
    { headers: sb }
  ).then((r) => r.json());
  if (Array.isArray(found) && found[0]) return found[0].id;

  const made = await fetch(`${SUPABASE_URL}/rest/v1/member_agent_threads`, {
    method: "POST",
    headers: { ...sb, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ community_member_id: memberId, title: "Imported history" }),
  }).then((r) => r.json());
  return Array.isArray(made) && made[0] ? made[0].id : null;
}

(async () => {
  if (!SUPABASE_URL || !SERVICE_KEY) return console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  if (!GHL_KEY) return console.error("Missing GHL_API_KEY");

  const filter = ONE_MEMBER ? `&id=eq.${ONE_MEMBER}` : "&contact_id=not.is.null";
  const members = await fetch(
    `${SUPABASE_URL}/rest/v1/community_members?select=id,first_name,last_name,contact_id${filter}`,
    { headers: sb }
  ).then((r) => r.json());

  if (!Array.isArray(members)) {
    console.error("Could not read community_members:", JSON.stringify(members).slice(0, 200));
    process.exit(1);
  }

  // Members sharing a GHL contact cannot be told apart. Same refusal the live
  // recorder makes — importing would put one person's words in another's memory.
  const seen = new Map();
  for (const m of members) seen.set(m.contact_id, (seen.get(m.contact_id) || 0) + 1);

  console.log(`\n${members.length} member(s) with a GHL contact\n`);
  let imported = 0, duplicate = 0, skipped = 0;

  for (const member of members) {
    const who = `${member.first_name || ""} ${member.last_name || ""}`.trim() || member.id.slice(0, 8);
    if (seen.get(member.contact_id) > 1) {
      console.log(`— ${who}: SKIPPED, contact ${member.contact_id} maps to ${seen.get(member.contact_id)} members`);
      skipped++;
      continue;
    }

    let convos;
    try {
      convos = (await ghlJson(`/conversations/search?contactId=${member.contact_id}&limit=20`)).conversations || [];
    } catch (e) {
      console.log(`— ${who}: FAILED to list conversations — ${String(e.message).slice(0, 90)}`);
      continue;
    }
    if (!convos.length) { console.log(`— ${who}: no conversations`); continue; }

    const threadId = SHOW_ONLY ? null : await threadFor(member.id);
    let mine = 0, dupes = 0;

    for (const convo of convos) {
      let msgs;
      try {
        const page = await ghlJson(`/conversations/${convo.id}/messages?limit=${PER_MEMBER}`);
        msgs = page?.messages?.messages || page?.messages || [];
      } catch (e) {
        console.log(`   conversation ${convo.id}: ${String(e.message).slice(0, 80)}`);
        continue;
      }

      // Oldest first, so the imported history reads in the order it happened.
      for (const m of [...msgs].reverse()) {
        const channel = channelOf(m);
        const content = textOf(m);
        if (!channel || !content) continue;

        /*
         * DELIVERY STATUS COSTS A SECOND HOP, so it is only fetched where it
         * exists and means something: outbound email. GHL keeps it on
         * /conversations/messages/email/{id} and not on the conversation
         * message, the same split that hid the recipient address.
         *
         * "Offered twice" and "offered twice, clicked once, never finished"
         * are different facts about different people. The second is worth an
         * extra call; the first is barely worth surfacing.
         */
        let deliveryStatus = null;
        if (channel === "email" && directionOf(m) === "outbound") {
          try {
            const emailId = m?.meta?.email?.messageIds?.[0];
            if (emailId) {
              const em = await ghlJson(`/conversations/messages/email/${emailId}`);
              const rec = em?.emailMessage ?? em?.message ?? em;
              deliveryStatus = rec?.status ?? null;
            }
          } catch {
            // A status we could not read is not a reason to lose the message.
          }
        }

        if (SHOW_ONLY) { mine++; continue; }

        /*
         * UPSERT, not insert. A plain insert made a re-run a no-op, which was
         * right when only the rows mattered. Now the CLASSIFICATION can improve
         * — and an import you cannot correct in place is one you would have to
         * delete and redo, on live memory. merge-duplicates resolves on the
         * (channel, external_id) index and rewrites the tag.
         */
        const res = await fetch(`${SUPABASE_URL}/rest/v1/member_agent_messages?on_conflict=channel,external_id`, {
          method: "POST",
          headers: { ...sb, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            thread_id: threadId,
            role: roleOf(m),
            content: content.slice(0, 4000),
            channel,
            external_id: m.id,
            source: sourceTag(m),
            delivery_status: deliveryStatus,
            status_checked_at: deliveryStatus ? new Date().toISOString() : null,
            // GHL's own timestamp, not now() — otherwise a year of history
            // imports as though it all happened this afternoon, and "recent"
            // stops meaning anything.
            created_at: m.dateAdded || new Date().toISOString(),
          }),
        });
        if (res.ok) mine++;
        else { const t = await res.text(); if (t.includes("23505")) dupes++; else if (mine === 0) console.log(`   write failed: ${t.slice(0,120)}`); }
      }
    }

    console.log(`— ${who}: ${mine} turn(s)${dupes ? `, ${dupes} already held` : ""}`);
    imported += mine; duplicate += dupes;
  }

  console.log(`\n${imported} imported, ${duplicate} already held, ${skipped} skipped as ambiguous.`);
  console.log(SHOW_ONLY ? "(--show: nothing written)\n" : "\n");
})();
