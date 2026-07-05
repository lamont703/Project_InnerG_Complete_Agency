// Backfills census tract/block group + school district onto the 4 entity
// tables where pricing/community-identity intelligence matters. Idempotent —
// only processes rows where census_tract_geoid is still null, so it's safe
// to re-run after a partial failure or to pick up newly-added shops later.
//
// ACS median household income is cached per unique tract (not called once
// per row) since many shops in the same tract would otherwise mean
// redundant Census Bureau API calls for identical data.
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SUPPRESSED_VALUE = -666666666;
const SCHOOL_DISTRICT_FEATURE_SERVER =
  "https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/School_Districts_Current/FeatureServer/0/query";

async function getCensusGeography(lat, lng) {
  const res = await fetch(`https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&format=json`);
  if (!res.ok) return null;
  const data = await res.json();
  const fips = data?.Block?.FIPS;
  if (!fips || fips.length !== 15) return null;
  const stateFips = fips.slice(0, 2);
  const countyFips = fips.slice(2, 5);
  const tractFips = fips.slice(5, 11);
  const blockGroupFips = fips.slice(11, 12);
  return {
    stateFips, countyFips, tractFips, blockGroupFips,
    tractGeoid: `${stateFips}${countyFips}${tractFips}`,
    blockGroupGeoid: `${stateFips}${countyFips}${tractFips}${blockGroupFips}`,
  };
}

const acsCache = new Map();
async function getAcsIncomeData(stateFips, countyFips, tractFips) {
  const key = `${stateFips}-${countyFips}-${tractFips}`;
  if (acsCache.has(key)) return acsCache.get(key);
  const apiKey = process.env.CENSUS_API_KEY;
  if (!apiKey) return null;
  const url = `https://api.census.gov/data/2023/acs/acs5?get=NAME,B19013_001E,B01003_001E&for=tract:${tractFips}&in=state:${stateFips}+county:${countyFips}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) { acsCache.set(key, null); return null; }
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length < 2) { acsCache.set(key, null); return null; }
  const [, income, population] = rows[1];
  const incomeNum = Number(income);
  const popNum = Number(population);
  const result = {
    medianHouseholdIncome: incomeNum === SUPPRESSED_VALUE || Number.isNaN(incomeNum) ? null : incomeNum,
    population: popNum === SUPPRESSED_VALUE || Number.isNaN(popNum) ? null : popNum,
  };
  acsCache.set(key, result);
  return result;
}

async function getSchoolDistrict(lat, lng) {
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "NAME,GEOID",
    returnGeometry: "false",
    f: "json",
  });
  const res = await fetch(`${SCHOOL_DISTRICT_FEATURE_SERVER}?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data?.features?.[0]?.attributes;
  if (!feature?.NAME) return null;
  return { name: feature.NAME, geoid: feature.GEOID };
}

async function enrichRow(table, idCol, row) {
  const { lat, lng } = row;
  const geo = await getCensusGeography(lat, lng);
  const district = await getSchoolDistrict(lat, lng);
  let income = null;
  if (geo) {
    income = await getAcsIncomeData(geo.stateFips, geo.countyFips, geo.tractFips);
  }

  const update = {
    census_tract_geoid: geo?.tractGeoid ?? null,
    census_block_group_geoid: geo?.blockGroupGeoid ?? null,
    census_median_household_income: income?.medianHouseholdIncome ?? null,
    census_population: income?.population ?? null,
    census_data_updated_at: geo ? new Date().toISOString() : null,
    school_district_name: district?.name ?? null,
    school_district_geoid: district?.geoid ?? null,
    school_district_updated_at: district ? new Date().toISOString() : null,
  };

  const { error } = await supabase.from(table).update(update).eq("id", row[idCol]);
  if (error) {
    console.error(`  FAILED to update ${table} id=${row[idCol]}:`, error.message);
    return false;
  }
  return true;
}

// Small bounded concurrency — polite to the free FCC/Census/ArcGIS
// endpoints, and none of them document a formal rate limit worth pushing
// against.
async function processBatch(items, worker, concurrency = 5) {
  let i = 0;
  let ok = 0, failed = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      const success = await worker(items[idx]);
      if (success) ok++; else failed++;
      if ((ok + failed) % 50 === 0) console.log(`  ...${ok + failed}/${items.length} processed`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next));
  return { ok, failed };
}

const TABLES = [
  { table: "agent_barbershop_leads", idCol: "id", cityCol: "city", nameCol: "shop_name" },
  { table: "agent_salon_leads", idCol: "id", cityCol: "city", nameCol: "shop_name" },
  { table: "agent_barber_leads", idCol: "id", cityCol: "metro_area", nameCol: "name" },
  { table: "agent_cosmetologist_leads", idCol: "id", cityCol: "metro_area", nameCol: "name" },
];

async function fetchAllRows(table, idCol, cityCol) {
  const pageSize = 1000;
  let allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(`${idCol}, latitude, longitude`)
      .ilike(cityCol, "%houston%")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .is("census_tract_geoid", null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows.map((r) => ({ [idCol]: r[idCol], lat: r.latitude, lng: r.longitude }));
}

(async () => {
  if (!process.env.CENSUS_API_KEY) {
    console.warn("WARNING: CENSUS_API_KEY not set — median household income will be skipped, tract/district still backfilled.");
  }

  for (const { table, idCol, cityCol } of TABLES) {
    console.log(`\n=== ${table} ===`);
    const rows = await fetchAllRows(table, idCol, cityCol);
    console.log(`${rows.length} Houston rows need enrichment`);
    if (rows.length === 0) continue;
    const { ok, failed } = await processBatch(rows, (row) => enrichRow(table, idCol, row));
    console.log(`Done: ${ok} succeeded, ${failed} failed`);
  }

  console.log("\nBackfill complete.");
})();
