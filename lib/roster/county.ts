/**
 * Which county a shop sits in, because that is what scopes a licence search.
 *
 * WHY IT MATTERS: statewide there are 30,405 Class A Barbers and "David Smith"
 * is several of them. Inside a county, 99% of first+last combinations are
 * unique — measured on 1,014 Harris County barbers, 998 unique. The county is
 * the difference between resolving a barber from a name and guessing.
 *
 * FIPS FIRST, CITY SECOND. The first five digits of a census tract GEOID are
 * the state and county FIPS code, which is exact. 44 of the 52 shops with an
 * open chair carry one. The city fallback covers the rest and is a heuristic:
 * a city can straddle counties, and Houston straddles five.
 */

/** State+county FIPS → the county name as TDLR spells it. */
const FIPS_TO_COUNTY: Record<string, string> = {
  "48201": "HARRIS",
  "48157": "FORT BEND",
  "48113": "DALLAS",
  "48029": "BEXAR",
  "48141": "EL PASO",
  "48439": "TARRANT",
  "48453": "TRAVIS",
  "48085": "COLLIN",
  "48121": "DENTON",
  "48339": "MONTGOMERY",
  "48491": "WILLIAMSON",
  "48215": "HIDALGO",
  "48355": "NUECES",
  "48303": "LUBBOCK",
  "48027": "BELL",
  "48061": "CAMERON",
  "48479": "WEBB",
  "48187": "GUADALUPE",
  "48041": "BRAZOS",
  "48181": "GRAYSON",
};

/**
 * Last resort, and deliberately small.
 *
 * Only the cities where shops actually are. A long speculative list would look
 * more thorough and be less correct: every entry is a claim that a city sits in
 * one county, and for the big metros that is only mostly true.
 */
const CITY_TO_COUNTY: Record<string, string> = {
  HOUSTON: "HARRIS",
  DALLAS: "DALLAS",
  "SAN ANTONIO": "BEXAR",
  "EL PASO": "EL PASO",
  "FORT WORTH": "TARRANT",
  AUSTIN: "TRAVIS",
  ARLINGTON: "TARRANT",
  PLANO: "COLLIN",
  KATY: "HARRIS",
  PEARLAND: "BRAZORIA",
  SUGAR_LAND: "FORT BEND",
};

export function countyForShop(shop: {
  census_tract_geoid?: string | null;
  city?: string | null;
}): string | null {
  const geoid = shop.census_tract_geoid ? String(shop.census_tract_geoid) : "";
  if (geoid.length >= 5) {
    const county = FIPS_TO_COUNTY[geoid.slice(0, 5)];
    if (county) return county;
  }
  // City fields carry a zip on the end — "Houston 77084" — so strip digits.
  const city = (shop.city || "").replace(/[\d,]/g, "").trim().toUpperCase();
  if (!city) return null;
  return CITY_TO_COUNTY[city] ?? CITY_TO_COUNTY[city.replace(/\s+/g, "_")] ?? null;
}
