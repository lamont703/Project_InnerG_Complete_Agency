import type { Metadata } from "next";
import { getCaliforniaHubData } from "@/lib/california-hub-data";
import { CaliforniaHubDirectory } from "@/components/california-hub/CaliforniaHubDirectory";
import { CaliforniaResourceIndex } from "@/components/california-hub/CaliforniaResourceIndex";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "California Barbershops, Hair Salons & Barber Schools Directory",
  description:
    "Find real barbershops, hair salons, barbers, and licensed cosmetology/barber schools across California — real ratings and real reviews, not available on Google.",
  keywords: [
    "california barbershops directory",
    "hair salons in california",
    "barbershops in california",
    "california barber schools",
    "california cosmetology schools",
    "find a barber california",
    "california hair stylists",
  ],
  openGraph: {
    title: "California Barbershops, Hair Salons & Barber Schools Directory",
    description: "Real barbershops, hair salons, barbers, and licensed schools across California — real ratings and reviews, not available on Google.",
    url: `${SITE_URL}/california`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/california` },
};

export default async function CaliforniaHubPage() {
  const data = await getCaliforniaHubData();

  return (
    <CaliforniaHubDirectory
      data={data}
      title="California Barbershops, Hair Salons & Barber Schools"
      subtitle={`${data.totalEntities.toLocaleString()} barbershops, hair salons, barbers, and licensed schools across California, with intelligence not available on Google.`}
      backHref="/search"
      backLabel="← Back to Search"
      beforeBackLink={<CaliforniaResourceIndex />}
    />
  );
}
