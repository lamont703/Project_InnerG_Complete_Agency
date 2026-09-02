#!/usr/bin/env node
/**
 * Cards about the SHAPE of the licensed trade, from the TDLR licensee file.
 *
 * WHY A THIRD CARD SOURCE. card-sources.js covers exam outcomes,
 * derived-cards.js covers figures that move on their own, entity-cards.js
 * covers the directory. None of them describe the licensed population itself —
 * how many of each license exist, where they are, and how lopsided the mix is.
 * That is 432,725 rows nobody outside TDLR holds in a queryable form.
 *
 * COUNTS ONLY, AND EXACT ONES. Every figure here is a `count(*)` with a filter,
 * not a sampled estimate. An earlier pass sampled the table and produced a
 * type breakdown that was wrong because Supabase caps a page at 1,000 rows
 * regardless of the range asked for — the sample looked complete and was not.
 *
 * NO PERSONAL COLUMNS. The lake carries license_number, business_name and
 * owner_telephone. None are read here and none may ever reach a card.
 *
 * `continuing_education_flag` IS DELIBERATELY UNUSED. It splits 107,677 Y to
 * 324,151 N, which is a striking ratio and completely unpublishable: nothing
 * states whether the flag means CE is required, completed, or outstanding.
 * CLAUDE.md already records that whether specialty license holders need CE at
 * all is unresolved. A number whose meaning is unknown is not a fact.
 *
 * Usage:
 *   node scripts/shorts/licence-cards.js --list
 */
require("dotenv").config({ path: ".env.local", override: true });
const { createClient } = require("@supabase/supabase-js");

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const todayLabel = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "America/Chicago", day: "numeric", month: "short", year: "numeric" }).format(new Date());

const SRC = `Source: TDLR licensee file · read ${todayLabel()}`;

/** Exact count, or throw. A silent zero would become a published falsehood. */
async function countWhere(col, val) {
  const s = db();
  const q = col ? s.from("tdlr_licensees_raw").select("*", { count: "exact", head: true }).eq(col, val)
                : s.from("tdlr_licensees_raw").select("*", { count: "exact", head: true });
  const { count, error } = await q;
  if (error) throw new Error(`${col}=${val}: ${error.message}`);
  if (count == null) throw new Error(`${col}=${val}: no count returned`);
  return count;
}

async function build() {
  const [total, cosmo, mani, esth, barber, maniEsth, fullEst, miniEst, cosSchool, barSchool, weaveEst, harris, dallas, tarrant] =
    await Promise.all([
      countWhere(null),
      countWhere("license_type", "Cosmetology Operator"),
      countWhere("license_type", "Cosmetology Manicurist"),
      countWhere("license_type", "Cosmetology Esthetician"),
      countWhere("license_type", "Class A Barber"),
      countWhere("license_type", "Cosmetology Manicurist/Esthetician"),
      countWhere("license_type", "Full Service Establishment"),
      countWhere("license_type", "Mini Establishment"),
      countWhere("license_type", "Cosmetology Private School"),
      countWhere("license_type", "Barber School"),
      countWhere("license_type", "Hair Weaving  Establishment"),
      countWhere("county", "HARRIS"),
      countWhere("county", "DALLAS"),
      countWhere("county", "TARRANT"),
    ]);

  const n = (x) => Number(x).toLocaleString();
  const specialty = mani + esth + maniEsth;

  return [
    {
      key: "lic-cosmo-vs-barber", chip: "Texas · Licensing", tone: "bad",
      stat: `${(cosmo / barber).toFixed(1)}x`,
      label: `more cosmetology operators than barbers are licensed in Texas.`,
      punch: `${n(cosmo)} against ${n(barber)}.`,
      source: SRC, question: "Does that match what you see in your city?",
      seoTitle: `Cosmetologists Outnumber Barbers ${(cosmo / barber).toFixed(1)} to 1 in Texas #Shorts`,
    },
    {
      key: "lic-manicurists-beat-barbers", chip: "Texas · Licensing", tone: "bad",
      stat: n(mani),
      label: `licensed manicurists in Texas — more than double the barbers.`,
      punch: `Barbers hold ${n(barber)} licenses. Nails is the bigger trade.`,
      source: SRC, question: "Surprised nails is bigger than barbering?",
      seoTitle: `Texas Has ${n(mani)} Manicurists and Only ${n(barber)} Barbers #Shorts`,
    },
    {
      key: "lic-esthetician-count", chip: "Texas · Licensing", tone: "good",
      stat: n(esth),
      label: `estheticians are licensed in Texas.`,
      punch: `Also more than the ${n(barber)} Class A barbers.`,
      source: SRC, question: "Is skincare the fastest-growing license?",
      seoTitle: `${n(esth)} Licensed Estheticians in Texas — More Than Barbers #Shorts`,
    },
    {
      key: "lic-specialty-share", chip: "Texas · Licensing", tone: "good",
      stat: n(specialty),
      label: `Texas licenses are specialty ones — nails, skin, or both.`,
      punch: `That is ${((specialty / total) * 100).toFixed(0)}% of every license on file.`,
      source: SRC, question: "Would you add a specialty license to yours?",
      seoTitle: `${n(specialty)} Texas Beauty Licenses Are Nails or Skin #Shorts`,
    },
    {
      key: "lic-barber-schools", chip: "Texas · Schools", tone: "bad",
      stat: n(barSchool),
      label: `barber schools are licensed in the whole of Texas.`,
      punch: `Against ${n(cosSchool)} private cosmetology schools.`,
      source: SRC, question: "Is that why barber programs fill up?",
      seoTitle: `Texas Has Only ${n(barSchool)} Licensed Barber Schools #Shorts`,
    },
    {
      key: "lic-barbers-per-school", chip: "Texas · Schools", tone: "bad",
      stat: n(Math.round(barber / barSchool)),
      label: `licensed barbers for every barber school in Texas.`,
      punch: `${n(barSchool)} schools. ${n(barber)} barbers.`,
      source: SRC, question: "Did your school have a waiting list?",
      seoTitle: `${n(Math.round(barber / barSchool))} Texas Barbers Per Barber School #Shorts`,
    },
    {
      key: "lic-harris-share", chip: "Texas · Licensing", tone: "good",
      stat: `${((harris / total) * 100).toFixed(1)}%`,
      label: `of every Texas beauty license sits in Harris County.`,
      punch: `${n(harris)} licenses in one county.`,
      source: SRC, question: "Is Houston oversaturated, or underserved?",
      seoTitle: `Harris County Holds ${((harris / total) * 100).toFixed(1)}% of Texas Beauty Licenses #Shorts`,
    },
    {
      key: "lic-top-three-counties", chip: "Texas · Licensing", tone: "good",
      stat: `${(((harris + dallas + tarrant) / total) * 100).toFixed(0)}%`,
      label: `of Texas beauty licenses are in just three counties.`,
      punch: `Harris, Dallas and Tarrant. 254 counties in the state.`,
      source: SRC, question: "Where is the least crowded market?",
      seoTitle: `3 Counties Hold ${(((harris + dallas + tarrant) / total) * 100).toFixed(0)}% of Texas Beauty Licenses #Shorts`,
    },
    {
      key: "lic-establishments", chip: "Texas · Shops", tone: "good",
      stat: n(fullEst + miniEst),
      label: `licensed establishments operate in Texas.`,
      punch: `${n(fullEst)} full service, ${n(miniEst)} mini.`,
      source: SRC, question: "Full service or mini — which would you open?",
      seoTitle: `${n(fullEst + miniEst)} Licensed Beauty Establishments in Texas #Shorts`,
    },
    {
      key: "lic-hair-weaving", chip: "Texas · Licensing", tone: "bad",
      stat: n(weaveEst),
      label: `hair weaving establishments are licensed in all of Texas.`,
      punch: `Eighty. In a state of thirty million people.`,
      source: SRC, question: "Underserved market, or wrong license?",
      seoTitle: `Only ${n(weaveEst)} Hair Weaving Shops Are Licensed in Texas #Shorts`,
    },
  ].map((c) => ({ ...c, date: todayLabel() }));
}

if (require.main === module) {
  (async () => {
    const cards = await build();
    console.log(`\n  ${cards.length} licence cards\n`);
    for (const c of cards) {
      console.log(`  ${c.key.padEnd(28)} ${String(c.stat).padEnd(9)} ${c.label.slice(0, 50)}`);
      console.log(`  ${"".padEnd(28)} ${"".padEnd(9)} ${c.punch.slice(0, 50)}`);
    }
    console.log("");
  })().catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { build };
