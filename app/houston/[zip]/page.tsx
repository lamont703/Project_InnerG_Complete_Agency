import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHoustonData } from "../data";
import { HoustonDirectory } from "../HoustonDirectory";

export const revalidate = 3600;

type Props = { params: Promise<{ zip: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { zip } = await props.params;
  return {
    title: `Houston ${zip} Barber & Cosmetology Directory | Inner G Complete`,
    description: `Barbershops, salons, licensed pros, and barber/cosmetology schools in the Houston ${zip} zip code — including real 2026 Texas licensing exam pass rates, not available on Google.`,
  };
}

export default async function HoustonZipPage(props: Props) {
  const { zip } = await props.params;

  if (!/^\d{5}$/.test(zip)) notFound();

  const data = await getHoustonData(zip);

  if (data.totalEntities === 0) notFound();

  return (
    <HoustonDirectory
      data={data}
      title={`Houston ${zip} Directory`}
      subtitle={`${data.totalEntities.toLocaleString()} barbershops, salons, schools, and licensed professionals in the ${zip} zip code.`}
      backHref="/houston"
      backLabel="← Back to Houston"
      zipQuerySuffix={` ${zip}`}
    />
  );
}
