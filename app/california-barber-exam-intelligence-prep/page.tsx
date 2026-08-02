import type { Metadata } from "next";
import { CaliforniaExamPrep } from "@/components/exam-prep/CaliforniaExamPrep";

export const revalidate = 3600;

const CANONICAL = "https://agency.innergcomplete.com/california-barber-exam-intelligence-prep";

export const metadata: Metadata = {
  title: "California Barber Exam Intelligence Prep — Real 2026 Pass Rates",
  description:
    "Real 2026 first-time written pass rates for California barber schools, from the California Board of Barbering & Cosmetology (BBC), ranked by school. Know where you stand before the California barber state board exam. Not available on Google.",
  keywords: [
    "california barber exam",
    "california barber state board",
    "california barber written exam pass rate",
    "bbc barber exam california",
    "california barber school pass rates",
    "how to pass california barber exam",
  ],
  openGraph: {
    title: "California Barber Exam Intelligence Prep — Real 2026 Pass Rates",
    description:
      "Real 2026 first-time written pass rates for California barber schools from the CA Board of Barbering & Cosmetology — not available on Google.",
    url: CANONICAL,
    type: "website",
  },
  alternates: { canonical: CANONICAL },
};

export default function Page() {
  return <CaliforniaExamPrep variant="barber" />;
}
