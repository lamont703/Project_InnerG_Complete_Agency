import { getEmploymentMatches } from "./data";
import { EmploymentMatchReview } from "./EmploymentMatchReview";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employment Match Review | Inner G Complete Agency",
  robots: { index: false, follow: false },
};

export default async function EmploymentMatchReviewPage() {
  const data = await getEmploymentMatches();
  return <EmploymentMatchReview data={data} />;
}
