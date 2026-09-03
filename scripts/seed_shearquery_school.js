/**
 * Set up ShearQuery School of Barbering & Cosmetology.
 *
 *   node scripts/seed_shearquery_school.js          # show what it would write
 *   node scripts/seed_shearquery_school.js --write  # write it
 *
 * THIS IS REAL CONFIGURATION, NOT SAMPLE DATA. It creates the school, the two
 * programs it is named for, and a working timetable. Every one of those is a
 * fact about how the school runs and is meant to be edited later, not thrown
 * away.
 *
 * IT SEEDS NO STUDENTS, deliberately. A student row is a real person who
 * enrolled. Inventing a few so the roster looks populated would put fictional
 * people into the school's own record on day one, and every hour total and
 * completion figure computed afterwards would be measuring them. The roster
 * being empty until somebody enrolls is the correct state.
 *
 * IDEMPOTENT. Re-running finds the school by name and leaves existing programs
 * and blocks alone, so it can be run after a migration without duplicating a
 * timetable.
 *
 * HOURS COME FROM 16 TAC §83.202(a) AND (d), read from the rendered rule on
 * 2026-08-30. The core/specialty split is not cosmetic: the distance ceilings
 * apply per segment, so a program stored as a single 1,000 cannot be checked.
 */

const fs = require("fs");
for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const l of fs.readFileSync(f, "utf8").split("\n")) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const { createClient } = require("@supabase/supabase-js");

const WRITE = process.argv.includes("--write");
const SCHOOL_NAME = "ShearQuery School of Barbering & Cosmetology";

/**
 * Only the two programs the school is named for.
 *
 * TDLR licenses six more specialties and this school may one day offer them,
 * but seeding programs nobody has decided to run would be inventing a
 * curriculum. Adding one later is four fields.
 */
const PROGRAMS = [
  // §83.202(a)(1) core 700 + (a)(3) barber specialty 300.
  { name: "Class A Barber", total: 1000, core: 700, specialty: 300 },
  // §83.202(a)(1) core 700 + (a)(2) cosmetology specialty 300.
  { name: "Cosmetology Operator", total: 1000, core: 700, specialty: 300 },
];

/**
 * A full-time hybrid week.
 *
 * Tuesday to Saturday on campus, with one distance theory block on Monday
 * evening — the shape that makes a hybrid program worth having, because Monday
 * night is exactly when the working student the sales page describes can study.
 *
 * IT IS DESIGNED UNDER THE MONTHLY CAP ON PURPOSE. 34 campus hours plus 3
 * distance is 37 a week, about 159 a month against the 184 ceiling in
 * §83.72(w). A timetable that breaches the cap by design would put every
 * student in violation without anybody making a mistake.
 *
 * The distance block is core theory only. Practical can never be remote, and
 * the database refuses to store a block that says otherwise.
 */
const WEEK = [
  { label: "Core theory (online)", weekday: 1, from: "18:00", to: "21:00", kind: "theory",    modality: "distance", segment: "core" },
  { label: "Core theory",          weekday: 2, from: "09:00", to: "12:00", kind: "theory",    modality: "campus",   segment: "core" },
  { label: "Core practical",       weekday: 2, from: "13:00", to: "17:00", kind: "practical", modality: "campus",   segment: "core" },
  { label: "Core theory",          weekday: 3, from: "09:00", to: "12:00", kind: "theory",    modality: "campus",   segment: "core" },
  { label: "Core practical",       weekday: 3, from: "13:00", to: "17:00", kind: "practical", modality: "campus",   segment: "core" },
  { label: "Core theory",          weekday: 4, from: "09:00", to: "12:00", kind: "theory",    modality: "campus",   segment: "core" },
  { label: "Core practical",       weekday: 4, from: "13:00", to: "17:00", kind: "practical", modality: "campus",   segment: "core" },
  { label: "Specialty theory",     weekday: 5, from: "09:00", to: "12:00", kind: "theory",    modality: "campus",   segment: "specialty" },
  { label: "Specialty practical",  weekday: 5, from: "13:00", to: "17:00", kind: "practical", modality: "campus",   segment: "specialty" },
  { label: "Clinic floor",         weekday: 6, from: "09:00", to: "15:00", kind: "practical", modality: "campus",   segment: "specialty" },
];

const toMinute = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

(async () => {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { error: probe } = await db.from("sis_schools").select("id").limit(1);
  if (probe) {
    console.error("  sis_schools is missing — push the SIS migrations first.");
    process.exit(1);
  }

  const weekly = WEEK.reduce((n, b) => n + (toMinute(b.to) - toMinute(b.from)) / 60, 0);
  const distance = WEEK.filter((b) => b.modality === "distance")
    .reduce((n, b) => n + (toMinute(b.to) - toMinute(b.from)) / 60, 0);

  console.log(`  ${SCHOOL_NAME}`);
  console.log(`  programs: ${PROGRAMS.map((p) => `${p.name} (${p.core}+${p.specialty})`).join(", ")}`);
  console.log(`  timetable: ${WEEK.length} blocks, ${weekly}h/week (${distance}h distance)`);
  console.log(`  ~${Math.round(weekly * 4.345)}h/month against the 184-hour §83.72(w) ceiling`);
  console.log(`  students seeded: 0 — a student row is a real person who enrolled`);

  if (!WRITE) {
    console.log("\n  DRY RUN. Re-run with --write to create these rows.");
    return;
  }

  // School
  let { data: school } = await db.from("sis_schools").select("id").eq("name", SCHOOL_NAME).maybeSingle();
  if (!school) {
    const { data, error } = await db.from("sis_schools")
      .insert({ name: SCHOOL_NAME, state: "TX", timezone: "America/Chicago" })
      .select("id").single();
    if (error) throw new Error(`school: ${error.message}`);
    school = data;
    console.log(`\n  created school ${school.id}`);
  } else {
    console.log(`\n  school already exists ${school.id}`);
  }

  for (const p of PROGRAMS) {
    let { data: prog } = await db.from("sis_programs")
      .select("id").eq("school_id", school.id).eq("name", p.name).maybeSingle();

    if (!prog) {
      const { data, error } = await db.from("sis_programs").insert({
        school_id: school.id, name: p.name,
        total_hours: p.total, core_hours: p.core, specialty_hours: p.specialty,
        // Left null: the engine defaults to half of each segment, which is the
        // stricter reading of §83.202(e) and the one worth being held to.
        core_distance_cap: null, specialty_distance_cap: null,
      }).select("id").single();
      if (error) throw new Error(`program ${p.name}: ${error.message}`);
      prog = data;
      console.log(`  created program ${p.name}`);
    } else {
      console.log(`  program ${p.name} already exists`);
    }

    const { data: existing } = await db.from("sis_schedule_blocks")
      .select("id").eq("program_id", prog.id).limit(1);
    if (existing && existing.length) {
      console.log(`    timetable already set for ${p.name} — left alone`);
      continue;
    }

    const rows = WEEK.map((b) => ({
      school_id: school.id, program_id: prog.id, label: b.label,
      weekday: b.weekday, starts_minute: toMinute(b.from), ends_minute: toMinute(b.to),
      kind: b.kind, modality: b.modality, segment: b.segment,
      effective_from: new Date().toISOString().slice(0, 10),
    }));
    const { error } = await db.from("sis_schedule_blocks").insert(rows);
    if (error) throw new Error(`schedule ${p.name}: ${error.message}`);
    console.log(`    ${rows.length} blocks written for ${p.name}`);
  }

  const { data: check } = await db.from("sis_schedule_blocks")
    .select("weekday, starts_minute, ends_minute, label, modality").eq("school_id", school.id)
    .order("weekday").order("starts_minute");
  console.log(`\n  timetable now on file (${check.length} rows across ${PROGRAMS.length} programs):`);
  const seen = new Set();
  for (const b of check) {
    const key = `${b.weekday}-${b.starts_minute}-${b.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const f = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    console.log(`    ${DAYS[b.weekday]} ${f(b.starts_minute)}-${f(b.ends_minute)}  ${b.label}${b.modality === "distance" ? " [online]" : ""}`);
  }
})().catch((e) => {
  console.error("  FAILED:", e.message);
  process.exit(1);
});
