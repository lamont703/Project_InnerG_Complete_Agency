import type { Metadata } from "next";
import { getCityHubData } from "@/lib/city-hub-data";
import { CityHubDirectory } from "@/components/city-hub/CityHubDirectory";

export const revalidate = 3600;

// Title/description deliberately focus on barbershops + schools, not
// salons — real El Paso salon coverage is 0 right now (verified live),
// and claiming otherwise in the metadata would be exactly the kind of
// thin/misleading content this platform's whole approach exists to avoid.
// The page itself still shows every category honestly, including the real
// "0" for salons, rather than hiding the gap.
export const metadata: Metadata = {
  title: "El Paso Barbershops Directory | Inner G Complete",
  description: "Find real barbershops and licensed barber/cosmetology schools in El Paso, TX — real ratings and reviews, not available on Google.",
};

export default async function ElPasoHubPage() {
  const data = await getCityHubData("El Paso");

  return (
    <CityHubDirectory
      data={data}
      title="El Paso Barbershops"
      subtitle={`${data.totalEntities.toLocaleString()} barbershops and licensed schools across El Paso — real ratings and reviews, not available on Google.`}
      cityLabel="El Paso"
      backHref="/tools/barbershop-search?q=El+Paso"
      backLabel="← Back to Search"
    />
  );
}
