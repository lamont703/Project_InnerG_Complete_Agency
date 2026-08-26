#!/usr/bin/env node
/**
 * Give every school a call-routing row, so the Call button works site-wide.
 *
 * Idempotent: a school that already has a row is left alone, because that row
 * may carry a tracking number or hand-tuned labels that this script has no way
 * to reproduce.
 *
 * Dry run by default. Pass --apply to write. The last thing this does is point
 * calls at real businesses, so it should be possible to see the whole plan
 * before any of it is true.
 */
const fs = require("fs");

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const URL = env.SUPABASE_URL.trim();
const KEY = env.SUPABASE_SERVICE_ROLE_KEY.trim();
const APPLY = process.argv.includes("--apply");

async function rest(method, path, body, prefer) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : [];
}

/** US/Canada only. A number we cannot dial is worse than no button. */
function e164(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}

/**
 * The name said out loud. "LLC" and "INC" are legal furniture — a person
 * answering the phone does not call it that, and neither should we.
 */
function greeting(name) {
  return String(name || "")
    .replace(/\b(l\.?l\.?c\.?|inc\.?|incorporated|co\.?|corp\.?)\b/gi, "")
    .replace(/\s*[-–,]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim() || String(name || "").trim();
}

/** What a caller might say. Only reached on the dial-in fallback. */
function phrases(name) {
  const g = greeting(name).toLowerCase();
  const set = new Set([g]);
  const words = g.split(/\s+/).filter(Boolean);
  if (words.length > 2) set.add(words.slice(0, 2).join(" "));
  if (words.length > 3) set.add(words.slice(0, 3).join(" "));
  return [...set].filter((p) => p.length >= 4).slice(0, 6);
}

const LABELS = { admissions: "admissions", financial_aid: "financial aid", education: "student services" };

async function page(table, cols) {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const rows = await rest("GET", `${table}?select=${cols}&limit=1000&offset=${off}`);
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

(async () => {
  const existing = new Set((await page("school_call_routing", "school_id")).map((r) => r.school_id));
  console.log(`existing routing rows: ${existing.size}`);

  const plan = [];
  const skipped = { already: 0, noPhone: 0, badPhone: 0 };

  for (const [table, type] of [["agent_barber_school_leads", "barber"], ["agent_cosmetology_school_leads", "cosmetology"]]) {
    const rows = await page(table, "id,school_name,phone");
    let ok = 0;
    for (const r of rows) {
      if (existing.has(r.id)) { skipped.already++; continue; }
      if (!r.phone) { skipped.noPhone++; continue; }
      const num = e164(r.phone);
      if (!num) { skipped.badPhone++; continue; }
      plan.push({
        school_id: r.id, school_type: type, school_name: r.school_name,
        greeting_name: greeting(r.school_name),
        destination_number: num, main_number: num,
        voice_match_phrases: phrases(r.school_name),
        department_labels: LABELS,
      });
      ok++;
    }
    console.log(`  ${table}: ${rows.length} schools -> ${ok} new routing rows`);
  }

  console.log(`\nto insert : ${plan.length}`);
  console.log(`skipped   : ${skipped.already} already routed, ${skipped.noPhone} no phone, ${skipped.badPhone} unusable phone`);
  console.log("\nsample:");
  for (const p of plan.slice(0, 4)) console.log(`   ${p.school_name.slice(0,34).padEnd(34)} "${p.greeting_name}" -> ${p.destination_number}`);

  if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); return; }

  for (let i = 0; i < plan.length; i += 200) {
    await rest("POST", "school_call_routing", plan.slice(i, i + 200), "return=minimal");
    process.stdout.write(`\r  inserted ${Math.min(i + 200, plan.length)}/${plan.length}`);
  }
  console.log("\ndone.");
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
