import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCityHubData } from "@/lib/city-hub-data";
import { CityHubDirectory } from "@/components/city-hub/CityHubDirectory";
import { citySlugToNameCA, CA_BESPOKE_CITY_ROUTES } from "@/lib/california-city-readiness";

export const revalidate = 3600;

type Props = { params: Promise<{ city: string; zip: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { city: slug, zip } = await props.params;
  const cityName = citySlugToNameCA(slug);

  if (!cityName) {
    return { title: "Directory Not Found | Inner G Complete" };
  }

  const title = `${cityName} ${zip} Barber & Cosmetology Directory | Inner G Complete`;
  const description = `Barbershops, salons, licensed pros, and barber/cosmetology schools in the ${cityName} ${zip} zip code — real ratings and reviews, not available on Google.`;
  const canonicalUrl = `https://agency.innergcomplete.com/california/${slug}/${zip}`;

  return {
    title,
    description,
    keywords: [`${cityName.toLowerCase()} ${zip}`, `barbershops ${zip}`, `salons near ${zip}`, `${cityName.toLowerCase()} zip ${zip}`],
    openGraph: { title, description, url: canonicalUrl, type: "website" },
    alternates: { canonical: canonicalUrl },
  };
}

// No generateStaticParams — fully on-demand, same choice
// app/texas/[city]/[zip]/page.tsx already made.
export default async function CaliforniaCityZipPage(props: Props) {
  const { city: slug, zip } = await props.params;

  if (!/^\d{5}$/.test(zip)) notFound();

  const cityName = citySlugToNameCA(slug);
  if (!cityName || CA_BESPOKE_CITY_ROUTES[slug]) notFound();

  const data = await getCityHubData(cityName, zip);
  if (data.totalEntities === 0) notFound();

  return (
    <CityHubDirectory
      data={data}
      title={`${cityName} ${zip} Directory`}
      subtitle={`${data.totalEntities.toLocaleString()} barbershops, salons, schools, and licensed professionals in the ${zip} zip code.`}
      cityLabel={cityName}
      citySlug={slug}
      basePath="/california"
      backHref={`/california/${slug}`}
      backLabel={`← Back to ${cityName}`}
      zipQuerySuffix={` ${zip}`}
    />
  );
}
