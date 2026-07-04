import type { Metadata } from "next";
import { getHoustonData } from "./data";
import { HoustonDirectory } from "./HoustonDirectory";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Houston Barber & Cosmetology Directory — Shops, Schools, Pros | Inner G Complete",
  description: "The full Houston barber and beauty landscape in one place: barbershops, salons, licensed pros, and barber/cosmetology schools ranked by real 2026 licensing exam pass rates — data not available on Google.",
};

export default async function HoustonHubPage() {
  const data = await getHoustonData();

  return (
    <HoustonDirectory
      data={data}
      title="Houston Barber & Cosmetology Directory"
      subtitle={`${data.totalEntities.toLocaleString()} barbershops, salons, schools, and licensed professionals across Houston — including school rankings from real 2026 Texas licensing exam outcomes, not available on Google.`}
      backHref="/tools/barbershop-search?q=Houston"
      backLabel="← Back to Search"
    />
  );
}
