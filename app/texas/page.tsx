import type { Metadata } from "next";
import { getTexasHubData } from "@/lib/texas-hub-data";
import { TexasHubDirectory } from "@/components/texas-hub/TexasHubDirectory";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Texas Barbershops, Hair Salons & Barber Schools Directory | Inner G Complete",
  description:
    "Find real barbershops, hair salons, barbers, and licensed cosmetology/barber schools across Texas — real ratings, real reviews, and 2026 licensing exam pass rates, not available on Google.",
  keywords: [
    "texas barbershops directory",
    "hair salons in texas",
    "barbershops in texas",
    "texas barber schools",
    "texas cosmetology schools",
    "find a barber texas",
    "texas hair stylists",
  ],
  openGraph: {
    title: "Texas Barbershops, Hair Salons & Barber Schools Directory",
    description: "Real barbershops, hair salons, barbers, and licensed schools across Texas — real ratings and reviews, not available on Google.",
    url: "https://agency.innergcomplete.com/texas",
    type: "website",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/texas" },
};

export default async function TexasHubPage() {
  const data = await getTexasHubData();

  return (
    <TexasHubDirectory
      data={data}
      title="Texas Barbershops, Hair Salons & Barber Schools"
      subtitle={`${data.totalEntities.toLocaleString()} barbershops, hair salons, barbers, and licensed schools across Texas — including real 2026 licensing exam outcomes, with intelligence not available on Google.`}
      backHref="/tools/barbershop-search"
      backLabel="← Back to Search"
    />
  );
}
