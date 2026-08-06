import type { Metadata } from "next";
import { CaliforniaExamPrep } from "@/components/exam-prep/CaliforniaExamPrep";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const CANONICAL = `${SITE_URL}/california-cosmetology-exam-intelligence-prep`;

export const metadata: Metadata = {
  title: "California Cosmetology Exam Intelligence Prep — Real 2026 Pass Rates",
  description:
    "Real 2026 first-time written pass rates for California cosmetology schools, from the California Board of Barbering & Cosmetology (BBC), ranked by school. Know where you stand before the California cosmetology state board exam. Not available on Google.",
  keywords: [
    "california cosmetology exam",
    "california cosmetology state board",
    "california cosmetology written exam pass rate",
    "bbc cosmetology exam california",
    "california cosmetology school pass rates",
    "how to pass california cosmetology exam",
  ],
  openGraph: {
    title: "California Cosmetology Exam Intelligence Prep — Real 2026 Pass Rates",
    description:
      "Real 2026 first-time written pass rates for California cosmetology schools from the CA Board of Barbering & Cosmetology — not available on Google.",
    url: CANONICAL,
    type: "website",
  },
  alternates: { canonical: CANONICAL },
};

export default function Page() {
  return <CaliforniaExamPrep variant="cosmetology" />;
}
