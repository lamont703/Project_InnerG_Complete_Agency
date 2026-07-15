import type { Metadata } from "next";
import { getCityHubData } from "@/lib/city-hub-data";
import { CityHubDirectory } from "@/components/city-hub/CityHubDirectory";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Dallas Barbershops & Hair Salons Directory | Inner G Complete",
  description: "Find real barbershops, hair salons, barbers, and licensed cosmetology/barber schools in Dallas, TX — real ratings, real reviews, real data, not available on Google.",
};

export default async function DallasHubPage() {
  const data = await getCityHubData("Dallas");

  return (
    <CityHubDirectory
      data={data}
      title="Dallas Barbershops & Hair Salons"
      subtitle={`${data.totalEntities.toLocaleString()} barbershops, hair salons, barbers, and licensed schools across Dallas — real ratings and reviews, not available on Google.`}
      cityLabel="Dallas"
      backHref="/tools/barbershop-search?q=Dallas"
      backLabel="← Back to Search"
    />
  );
}
