import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getCityHubData } from "@/lib/city-hub-data";
import { CityHubDirectory } from "@/components/city-hub/CityHubDirectory";
import { MIN_TOTAL_BUSINESSES, MIN_PER_CATEGORY } from "@/lib/city-readiness";
import { citySlugToNameCA, getQualifyingCitiesCA, CA_BESPOKE_CITY_ROUTES } from "@/lib/california-city-readiness";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Props = { params: Promise<{ city: string }> };

// California twin of app/texas/[city]/page.tsx. No CITY_METADATA_OVERRIDES
// here — unlike Dallas/El Paso, no California city has a pre-existing,
// already-indexed standalone page whose exact metadata needs preserving;
// every qualifying California city gets the templated metadata below.
export async function generateStaticParams() {
  const qualifying = await getQualifyingCitiesCA(supabase);
  return qualifying.filter((c) => c.qualifies && !CA_BESPOKE_CITY_ROUTES[c.slug]).map((c) => ({ city: c.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { city: slug } = await props.params;
  const cityName = citySlugToNameCA(slug);

  if (!cityName) {
    return { title: "Directory Not Found" };
  }

  const title = `${cityName} Barbershops & Salons Directory | Inner G Complete`;
  const description = `Find real barbershops, hair salons, barbers, and licensed cosmetology/barber schools in ${cityName}, CA — real ratings, real reviews, real data, not available on Google.`;
  const canonicalUrl = `${SITE_URL}/california/${slug}`;
  const lowerCity = cityName.toLowerCase();

  return {
    title,
    description,
    keywords: [
      `${lowerCity} barber`,
      `barbershops ${lowerCity} ca`,
      `hair salon ${lowerCity} ca`,
      `${lowerCity} beauty salon`,
      `barbershops in ${lowerCity}`,
    ],
    openGraph: { title, description, url: canonicalUrl, type: "website" },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function CaliforniaCityHubPage(props: Props) {
  const { city: slug } = await props.params;

  // Strict allow-list only, same reasoning as app/texas/[city]/page.tsx.
  const cityName = citySlugToNameCA(slug);
  if (!cityName || CA_BESPOKE_CITY_ROUTES[slug]) notFound();

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
      basePath="/california"
      backHref={`/search?q=${encodeURIComponent(cityName)}`}
      backLabel="← Back to Search"
    />
  );
}
