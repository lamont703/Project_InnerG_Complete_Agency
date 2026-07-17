import type { Metadata } from "next";
import { getHoustonData } from "./data";
import { HoustonDirectory } from "./HoustonDirectory";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Houston Barbershops, Hair Salons & Hair Stylists Directory | Inner G Complete",
  description: "Find real hair stylists, hairdressers, barbershops, and hair salons in Houston, TX — plus licensed cosmetology and barber schools ranked by real 2026 licensing exam pass rates, data not available on Google.",
  keywords: [
    "houston barber",
    "barbershops houston tx",
    "hair salon houston tx",
    "houston hair stylist",
    "houston beauty salon",
    "houston cosmetology school",
  ],
  openGraph: {
    title: "Houston Barbershops, Hair Salons & Hair Stylists Directory",
    description: "Find real hair stylists, hairdressers, barbershops, and hair salons in Houston, TX — plus licensed cosmetology and barber schools ranked by real 2026 exam pass rates.",
    url: "https://agency.innergcomplete.com/houston",
    type: "website",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/houston" },
};

export default async function HoustonHubPage() {
  const data = await getHoustonData();

  return (
    <HoustonDirectory
      data={data}
      title="Houston Barbershops, Hair Salons & Hair Stylists"
      subtitle={`${data.totalEntities.toLocaleString()} barbershops, hair salons, hair stylists, schools, and licensed professionals across Houston — including school rankings from real 2026 Texas licensing exam outcomes, not available on Google.`}
      backHref="/tools/barbershop-search?q=Houston"
      backLabel="← Back to Search"
    />
  );
}
