/**
 * Sync community members → GoHighLevel contacts.
 *
 * Signups now reach GHL as they happen (app/api/community/register/route.ts).
 * This covers the two cases that route can't: members who signed up before the
 * sync existed, and any whose sync failed at the time — both show up as a null
 * contact_id, which is this script's work queue.
 *
 * SAFE BY DEFAULT: dry-run unless --live is passed. Idempotent, so re-running
 * costs nothing.
 *
 *   node scripts/sync_members_to_ghl.js           # preview
 *   node scripts/sync_members_to_ghl.js --live    # apply
 *   node scripts/sync_members_to_ghl.js --live --all   # re-sync everyone, not
 *                                                       just the unsynced
 *
 * Mirrors lib/ghl-contacts.ts — same two-call shape, and for the same reason:
 * POST /contacts/upsert REPLACES tags, so tags go on separately and additively.
 * Keep the two in step.
 */
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const LIVE = process.argv.includes("--live");
const ALL = process.argv.includes("--all");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const headers = {
  Authorization: `Bearer ${GHL_API_KEY}`,
  "Content-Type": "application/json",
  Version: "2021-07-28",
};

// Must match normalizePhone() in lib/ghl-contacts.ts.
function normPhone(raw) {
  if (!raw) return null;
  const t = String(raw).trim();
  // "+" first: see the note in lib/ghl-contacts.ts. Checking the 10-digit rule
  // ahead of it turns "+0123456789" into "+10123456789".
  if (t.startsWith("+")) {
    const dd = t.replace(/[^\d]/g, "");
    return /^[1-9]\d{7,14}$/.test(dd) ? `+${dd}` : null;
  }
  const d = t.replace(/[^\d]/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === "1") return `+${d}`;
  return /^[1-9]\d{9,14}$/.test(d) ? `+${d}` : null;
}

// Mirrors isTestContact() in lib/ghl-contacts.ts. A CRM full of fake contacts
// is worse than one missing a few — they get counted, emailed and followed up.
function isTestContact(email, phone) {
  const e = (email || "").trim().toLowerCase();
  const digits = (phone || "").replace(/[^\d]/g, "");
  if (/@(testuser\.com|example\.(com|org|net)|test\.com|mailinator\.com)$/.test(e)) return true;
  if (/^(test|testing|dummy|fake)[+@]/.test(e)) return true;
  const local = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (local.length === 10 && local.slice(3) === "5555555") return true;
  if (local.length === 10 && /^55501\d\d$/.test(local.slice(3))) return true;
  return false;
}

async function ghl(url, body, attempts = 4) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (res.ok) return { ok: true, data: await res.json().catch(() => ({})) };
    if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
    return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 180)}` };
  }
  return { ok: false, error: "retries exhausted" };
}

(async () => {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.error("Missing GHL_API_KEY / GHL_LOCATION_ID");
    process.exit(1);
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let q = db.from("community_members").select("id, first_name, last_name, email, phone, contact_id");
  if (!ALL) q = q.is("contact_id", null);
  const { data: members, error } = await q;
  if (error) { console.error("Query failed:", error.message); process.exit(1); }

  console.log(`${LIVE ? "LIVE" : "DRY RUN"} — ${members.length} member(s) ${ALL ? "(all)" : "without a GHL contact"}\n`);

  // Which entities a member has claimed, so the contact carries the same tag a
  // signup-time sync would have given it.
  const { data: links } = await db.from("community_member_entity_links").select("community_member_id, entity_type");
  const claimsByMember = new Map();
  for (const l of links || []) {
    claimsByMember.set(l.community_member_id, [...(claimsByMember.get(l.community_member_id) || []), l.entity_type]);
  }

  const totals = { sent: 0, created: 0, updated: 0, tagged: 0, skipped: 0, skippedTest: 0, failed: 0 };

  for (const m of members) {
    const name = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
    const phone = normPhone(m.phone);
    const email = (m.email || "").trim() || undefined;

    if (!email && !phone) {
      console.log(`  SKIP  ${name || m.id} — no usable email or phone`);
      totals.skipped++;
      continue;
    }

    // Mirrors isTestContact() in lib/ghl-contacts.ts — keep the two in step.
    if (isTestContact(email, phone)) {
      console.log(`  SKIP  ${name || m.id} — test account (${email || phone})`);
      totals.skippedTest++;
      continue;
    }

    const claims = claimsByMember.get(m.id) || [];
    const tags = [
      "Community Member",
      "Table: community_members",
      ...claims.map((t) => `Claimed: ${t}`),
    ];

    if (!LIVE) {
      console.log(`  would sync  ${name || "(no name)"}  ${email || ""} ${phone || ""}  [${tags.join(", ")}]`);
      totals.sent++;
      continue;
    }

    const up = await ghl(`${GHL_API_BASE}/contacts/upsert`, {
      locationId: GHL_LOCATION_ID,
      source: "Community Signup (backfill)",
      ...(name ? { name, firstName: m.first_name, lastName: m.last_name } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      // No tags — the upsert would replace whatever this contact already has.
    });

    if (!up.ok) { console.log(`  FAIL  ${name || m.id}: ${up.error}`); totals.failed++; continue; }

    const contactId = up.data?.contact?.id;
    if (!contactId) { console.log(`  FAIL  ${name || m.id}: no contact id returned`); totals.failed++; continue; }

    totals.sent++;
    up.data?.new ? totals.created++ : totals.updated++;

    const tagRes = await ghl(`${GHL_API_BASE}/contacts/${contactId}/tags`, { tags });
    if (tagRes.ok) totals.tagged++;
    else console.log(`  warn  ${name || m.id}: contact saved, tags failed (${tagRes.error})`);

    const { error: updErr } = await db
      .from("community_members")
      .update({ contact_id: contactId, contact_synced_at: new Date().toISOString() })
      .eq("id", m.id);
    if (updErr) console.log(`  warn  ${name || m.id}: contact ${contactId} not recorded (${updErr.message})`);
    else console.log(`  ok    ${name || m.id} → ${contactId}${up.data?.new ? " (new)" : ""}`);

    await sleep(150); // ~6/s, well under GHL burst limits
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`sent:     ${totals.sent}  (created ${totals.created}, updated ${totals.updated})`);
  console.log(`tagged:   ${totals.tagged}`);
  console.log(`skipped:  ${totals.skipped}  (no email or phone), ${totals.skippedTest} test account(s)`);
  console.log(`failed:   ${totals.failed}`);
  if (!LIVE) console.log(`\nDry run — nothing was written. Re-run with --live to apply.`);
})();
