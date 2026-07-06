// Backend geo-enrichment: maps a lat/long to its Census tract/block group
// (+ demographic data) and school district. All three underlying services
// were validated directly against real shop coordinates before this was
// written — see the FCC, Census ACS, and ArcGIS-hosted NCES school district
// FeatureServer calls this wraps.

// City fields are inconsistently formatted across tables ("Houston 77096",
// bare "Houston" with the zip only in formatted_address/address, etc.) —
// this extracts a zip from whichever field actually has one. Originally
// lived in app/houston/data.ts; moved here so the rent-by-zip AI tool can
// share the same tested logic instead of duplicating it.
export function extractZip(value: string | null | undefined): string | null {
  if (!value) return null;
  // "123 Main St, Houston, TX 77034, USA" — the zip directly follows "TX ",
  // which distinguishes it from a street number earlier in the same string
  // (e.g. "12344 Gulf Fwy..." would otherwise wrongly match as the zip).
  // Checked before the trailing-digits fallback for that reason.
  const txMatch = value.match(/\bTX\s+(\d{5})/i);
  if (txMatch) return txMatch[1];
  // "Houston 77096" — bare city + zip, no street number present to confuse it.
  const trailingMatch = value.match(/(\d{5})\s*$/);
  if (trailingMatch) return trailingMatch[1];
  return null;
}

export interface CensusGeography {
  stateFips: string;
  countyFips: string;
  tractFips: string;
  blockGroupFips: string;
  tractGeoid: string; // state+county+tract, 11 digits
  blockGroupGeoid: string; // state+county+tract+block group, 12 digits
}

export interface AcsIncomeData {
  medianHouseholdIncome: number | null;
  population: number | null;
}

export interface SchoolDistrict {
  name: string;
  geoid: string;
}

// FCC's block FIPS is state(2) + county(3) + tract(6) + block(4). The block
// group is just the first digit of the 4-digit block code — not a separate
// lookup, this is how the Census Bureau defines block groups.
export async function getCensusGeography(lat: number, lng: number): Promise<CensusGeography | null> {
  try {
    const res = await fetch(`https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    const fips: string | undefined = data?.Block?.FIPS;
    if (!fips || fips.length !== 15) return null;

    const stateFips = fips.slice(0, 2);
    const countyFips = fips.slice(2, 5);
    const tractFips = fips.slice(5, 11);
    const blockGroupFips = fips.slice(11, 12);

    return {
      stateFips,
      countyFips,
      tractFips,
      blockGroupFips,
      tractGeoid: `${stateFips}${countyFips}${tractFips}`,
      blockGroupGeoid: `${stateFips}${countyFips}${tractFips}${blockGroupFips}`,
    };
  } catch (e) {
    console.error("getCensusGeography failed:", e);
    return null;
  }
}

// Census ACS suppresses unavailable estimates as -666666666 rather than
// null/omitting the field — has to be checked for explicitly or it reads as
// a real (nonsensical) income figure.
const SUPPRESSED_VALUE = -666666666;

export async function getAcsIncomeData(stateFips: string, countyFips: string, tractFips: string): Promise<AcsIncomeData | null> {
  const apiKey = process.env.CENSUS_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://api.census.gov/data/2023/acs/acs5?get=NAME,B19013_001E,B01003_001E&for=tract:${tractFips}&in=state:${stateFips}+county:${countyFips}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length < 2) return null;
    const [, income, population] = rows[1];
    const incomeNum = Number(income);
    const popNum = Number(population);
    return {
      medianHouseholdIncome: incomeNum === SUPPRESSED_VALUE || Number.isNaN(incomeNum) ? null : incomeNum,
      population: popNum === SUPPRESSED_VALUE || Number.isNaN(popNum) ? null : popNum,
    };
  } catch (e) {
    console.error("getAcsIncomeData failed:", e);
    return null;
  }
}

const SCHOOL_DISTRICT_FEATURE_SERVER =
  "https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/School_Districts_Current/FeatureServer/0/query";

export async function getSchoolDistrict(lat: number, lng: number): Promise<SchoolDistrict | null> {
  try {
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
  } catch (e) {
    console.error("getSchoolDistrict failed:", e);
    return null;
  }
}
