import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Salon Suites for Rent in Houston | Inner G Complete",
  description:
    "Looking for salon suites for rent in Houston? See real, currently-listed suite availability the moment salons report it — plus what a suite rental actually requires in Texas.",
  keywords: [
    "salon suites for rent houston",
    "salon suites for rent in houston tx",
    "salon suite rental houston",
    "private salon suites for rent houston",
    "salon suite requirements",
    "salon booth rental near me",
  ],
  openGraph: {
    title: "Salon Suites for Rent in Houston | Inner G Complete",
    description: "Real, currently-listed salon suite availability in Houston, plus what a suite rental requires in Texas.",
    url: `${SITE_URL}/salon-suites-for-rent-houston`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/salon-suites-for-rent-houston` },
};

export default function SalonSuitesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
