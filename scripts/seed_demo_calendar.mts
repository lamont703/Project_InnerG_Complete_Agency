/**
 * Give a ShearQuery member the demo appointment book, for an agency demo.
 *
 *   npx vite-node --config vitest.config.ts scripts/seed_demo_calendar.mts -- --email someone@agency.com
 *
 * 1. Finds the member by email — they must have signed up first.
 * 2. Grants them calendar access (a feature_access row), so no deploy is needed.
 * 3. Fills their calendar with made-up data (lib/calendar/demo.ts). Running it
 *    again refreshes the demo. It refuses anyone whose calendar is real.
 *
 * Runs through vite-node with the vitest config so the calendar code is reused
 * as-is (the config stubs "server-only" and resolves "@/").
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true } as any);

const args = process.argv.slice(2);
const email = (args[args.indexOf("--email") + 1] || "").trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: … seed_demo_calendar.mts -- --email someone@agency.com");
  process.exit(1);
}

const { createAdminClient } = await import("../lib/supabase/admin");
const { seedDemoCalendar } = await import("../lib/calendar/demo");
const db = createAdminClient() as any;

const { data: member } = await db.from("community_members").select("id, first_name, email").ilike("email", email).maybeSingle();
if (!member) {
  console.error(`No ShearQuery member with email ${email}. They need to sign up at shearquery.com first.`);
  process.exit(1);
}

const { error: grantErr } = await db.from("feature_access").upsert({ email, feature: "calendar", note: "agency demo" }, { onConflict: "email,feature" });
if (grantErr) {
  console.error("Could not grant calendar access:", grantErr.message);
  process.exit(1);
}

const result = await seedDemoCalendar(member.id);
console.log(`Demo ready for ${member.first_name || email}: ${result.services} services, ${result.clients} clients, ${result.appointments} appointments${result.skipped ? ` (${result.skipped} skipped)` : ""}.`);
console.log(`They connect Claude to https://shearquery.com/mcp and ask "what's on my calendar this week?"`);
process.exit(0);
