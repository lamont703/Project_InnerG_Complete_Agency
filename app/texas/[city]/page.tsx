import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getCityHubData } from "@/lib/city-hub-data";
import { CityHubDirectory } from "@/components/city-hub/CityHubDirectory";
import { citySlugToName, getQualifyingCities, BESPOKE_CITY_ROUTES, MIN_TOTAL_BUSINESSES, MIN_PER_CATEGORY } from "@/lib/city-readiness";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Props = { params: Promise<{ city: string }> };

// Dallas/El Paso's real, already-indexed title/description, preserved
// verbatim from their now-deleted standalone page.tsx files (including El
// Paso's own honest zero-salon caveat) — this consolidation must not
// change a single character of already-live metadata for either.
const CITY_METADATA_OVERRIDES: Record<string, { title: string; description: string }> = {
  dallas: {
    title: "Dallas Barbershops & Hair Salons Directory",
    description:
      "Find real barbershops, hair salons, barbers, and licensed cosmetology/barber schools in Dallas, TX — real ratings, real reviews, real data, not available on Google.",
  },
  "el-paso": {
    title: "El Paso Barbershops Directory | Inner G Complete",
    description:
      "Find real barbershops and licensed barber/cosmetology schools in El Paso, TX — real ratings and reviews, not available on Google.",
  },
};

// Pre-renders every currently-qualifying, non-bespoke city at build time —
// dynamicParams stays true (Next.js default), so a city crossing the
// readiness bar between deploys still renders correctly on demand and
// self-validates via its own fetched data (same notFound() pattern
// app/houston/[zip]/page.tsx already uses).
export async function generateStaticParams() {
  const qualifying = await getQualifyingCities(supabase);
  return qualifying.filter((c) => c.qualifies && !BESPOKE_CITY_ROUTES[c.slug]).map((c) => ({ city: c.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { city: slug } = await props.params;
  const cityName = citySlugToName(slug);
  const override = CITY_METADATA_OVERRIDES[slug];

  if (!cityName && !override) {
    return { title: "Directory Not Found" };
  }

  const title = override?.title || `${cityName} Barbershops & Salons Directory | Inner G Complete`;
  const description =
    override?.description ||
    `Find real barbershops, hair salons, barbers, and licensed cosmetology/barber schools in ${cityName}, TX — real ratings, real reviews, real data, not available on Google.`;
  const canonicalUrl = `${SITE_URL}/texas/${slug}`;
  const lowerCity = (cityName || slug).toLowerCase();

  return {
    title,
    description,
    keywords: [
      `${lowerCity} barber`,
      `barbershops ${lowerCity} tx`,
      `hair salon ${lowerCity} tx`,
      `${lowerCity} beauty salon`,
      `barbershops in ${lowerCity}`,
    ],
    openGraph: { title, description, url: canonicalUrl, type: "website" },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function CityHubPage(props: Props) {
  const { city: slug } = await props.params;

  // Strict allow-list only — this route now sits under /texas/[city] (moved
  // from the app root), so it only intercepts unmatched paths under /texas,
  // not every single-segment path on the site — but resolution still
  // shouldn't fuzzy-match, no reason to loosen it now that it's safer.
  const cityName = citySlugToName(slug);
  if (!cityName || BESPOKE_CITY_ROUTES[slug]) notFound();

  const data = await getCityHubData(cityName);
  const shopCount = data.sections.find((s) => s.key === "shops")?.count || 0;
  const salonCount = data.sections.find((s) => s.key === "salons")?.count || 0;
  const total = shopCount + salonCount;

  // Same 15/5/5 bar as the Market Expansion Readiness Agent, computed
  // directly from data already fetched above — no second DB round trip.
  if (total < MIN_TOTAL_BUSINESSES || shopCount < MIN_PER_CATEGORY || salonCount < MIN_PER_CATEGORY) notFound();

  return (
    <CityHubDirectory
      data={data}
      title={`${cityName} Barbershops & Salons`}
      subtitle={`${data.totalEntities.toLocaleString()} barbershops, hair salons, barbers, and licensed schools across ${cityName} — real ratings and reviews, not available on Google.`}
      cityLabel={cityName}
      citySlug={slug}
      backHref={`/tools/barbershop-search?q=${encodeURIComponent(cityName)}`}
      backLabel="← Back to Search"
    />
  );
}
