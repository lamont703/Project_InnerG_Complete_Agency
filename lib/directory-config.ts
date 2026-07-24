/**
 * Config for the crawlable A–Z directory at /directory.
 *
 * Each entity family gets a paginated browse path (/directory/<key>, then
 * /directory/<key>/2, /3, …) that renders a plain HTML list of <a> links down
 * to every profile page. This is the internal-link backbone that gives Google
 * a real crawl tree to the long tail of entities — previously most profiles
 * were only reachable via the sitemap (orphan pages), because the hub "See All"
 * links point at the client-side search app, which renders zero crawlable
 * links. See lib/directory-data.ts for the fetch layer.
 *
 * NOTE: two pairs of families share a profile route on purpose — barber &
 * cosmetology schools both live under /schools/[slug], and barber-supply &
 * beauty-supply stores both under /stores/[slug] — but they stay distinct
 * browse types here because they're distinct directories to a user (and to us).
 */
export interface DirectoryType {
  key: string; // URL segment under /directory
  label: string; // plural, e.g. "Barbershops"
  labelSingular: string;
  table: string;
  entityPrefix: string; // profile route prefix, e.g. "/shop"
  nameCol: string;
  cityCol: string; // column used to DISPLAY a row's city
  cityFallbackCol?: string; // used when cityCol is null (barbers/cosmetologists)
  // Column used to FILTER by city on scoped pages (/directory/<type>/<city>).
  // Defaults to cityCol; shops & salons override to formatted_address because
  // their `city` column is proven unreliable outside Houston — this mirrors
  // exactly how lib/city-hub-data.ts matches each family to a city.
  cityFilterCol?: string;
  description: string;
}

export const PAGE_SIZE = 100;

export const DIRECTORY_TYPES: DirectoryType[] = [
  {
    key: "barbershops",
    label: "Barbershops",
    labelSingular: "Barbershop",
    table: "agent_barbershop_leads",
    entityPrefix: "/shop",
    nameCol: "shop_name",
    cityCol: "city",
    cityFilterCol: "formatted_address",
    description: "Every barbershop in our directory, browsable A–Z by city.",
  },
  {
    key: "salons",
    label: "Hair Salons",
    labelSingular: "Hair Salon",
    table: "agent_salon_leads",
    entityPrefix: "/salons",
    nameCol: "shop_name",
    cityCol: "city",
    cityFilterCol: "formatted_address",
    description: "Every hair salon in our directory, browsable A–Z by city.",
  },
  {
    key: "barbers",
    label: "Barbers",
    labelSingular: "Barber",
    table: "agent_barber_leads",
    entityPrefix: "/barbers",
    nameCol: "name",
    cityCol: "metro_area",
    cityFallbackCol: "address",
    description: "Every licensed barber profile in our directory.",
  },
  {
    key: "cosmetologists",
    label: "Cosmetologists",
    labelSingular: "Cosmetologist",
    table: "agent_cosmetologist_leads",
    entityPrefix: "/cosmetologists",
    nameCol: "name",
    cityCol: "metro_area",
    cityFallbackCol: "address",
    description: "Every licensed cosmetologist profile in our directory.",
  },
  {
    key: "barber-schools",
    label: "Barber Schools",
    labelSingular: "Barber School",
    table: "agent_barber_school_leads",
    entityPrefix: "/schools",
    nameCol: "school_name",
    cityCol: "city",
    description: "Every barber school in our directory, with state board pass-rate coverage.",
  },
  {
    key: "cosmetology-schools",
    label: "Cosmetology Schools",
    labelSingular: "Cosmetology School",
    table: "agent_cosmetology_school_leads",
    entityPrefix: "/schools",
    nameCol: "school_name",
    cityCol: "city",
    description: "Every cosmetology school in our directory, with state board pass-rate coverage.",
  },
  {
    key: "barber-supply-stores",
    label: "Barber Supply Stores",
    labelSingular: "Barber Supply Store",
    table: "agent_barber_supply_store_leads",
    entityPrefix: "/stores",
    nameCol: "name",
    cityCol: "city",
    description: "Every barber supply store in our directory.",
  },
  {
    key: "beauty-supply-stores",
    label: "Beauty Supply Stores",
    labelSingular: "Beauty Supply Store",
    table: "agent_beauty_supply_store_leads",
    entityPrefix: "/stores",
    nameCol: "name",
    cityCol: "city",
    description: "Every beauty supply store in our directory.",
  },
  {
    key: "events",
    label: "Events",
    labelSingular: "Event",
    table: "events",
    entityPrefix: "/events",
    nameCol: "title",
    cityCol: "city",
    description: "Industry events, shows, and meetups in our directory.",
  },
];

export function getDirectoryType(key: string): DirectoryType | undefined {
  return DIRECTORY_TYPES.find((t) => t.key === key);
}

/**
 * Maps a hub-section key (from texas-hub-data / california-hub-data /
 * city-hub-data — e.g. "shops", "cosmetSchools") to its crawlable browse path,
 * so hub "View All" links point at the directory instead of the client-side
 * search app (which renders zero crawlable links). The combined "stores"
 * section has no single list — barber-supply and beauty-supply are separate
 * families — so it goes to the directory index where both are one click away.
 */
const SECTION_TO_DIRECTORY_KEY: Record<string, string> = {
  shops: "barbershops",
  salons: "salons",
  barbers: "barbers",
  cosmetologists: "cosmetologists",
  barberSchools: "barber-schools",
  cosmetSchools: "cosmetology-schools",
  events: "events",
  stores: "", // combined family → index
};

export function directoryHrefForSection(sectionKey: string, citySlug?: string): string {
  const key = SECTION_TO_DIRECTORY_KEY[sectionKey];
  // The combined "stores" section (barber-supply + beauty-supply) has no single
  // list, so it always goes to the index — a city can't scope it cleanly.
  if (!key) return "/directory";
  return citySlug ? `/directory/${key}/${citySlug}` : `/directory/${key}`;
}

/** Distinct columns to SELECT for a browse list (slug + name + city fields). */
export function selectColumnsFor(t: DirectoryType): string {
  const cols = new Set(["slug", "updated_at", t.nameCol, t.cityCol]);
  if (t.cityFallbackCol) cols.add(t.cityFallbackCol);
  return [...cols].join(", ");
}
