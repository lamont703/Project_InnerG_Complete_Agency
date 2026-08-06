import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "How to Get a Cosmetology License in Texas (2026 Requirements)",
  description:
    "Step-by-step: how to get a cosmetology license in Texas — TDLR-approved training hours, the PSI written & practical operator exam, application steps, and renewal — plus real 2026 pass rates for every Texas cosmetology school.",
  keywords: [
    "how to get a cosmetology license in texas",
    "cosmetology licensure",
    "texas cosmetology license requirements",
    "cosmetology operator license texas",
    "tdlr cosmetology license",
    "cosmetology license texas cost",
    "how long does it take to get a cosmetology license in texas",
    "cosmetology state board exam texas",
    "tdlr cosmetology license renewal",
  ],
  openGraph: {
    title: "How to Get a Cosmetology License in Texas (2026 Requirements)",
    description:
      "TDLR-approved training hours, the PSI written & practical operator exam, application steps, and renewal — plus real 2026 pass rates for every Texas cosmetology school.",
    url: `${SITE_URL}/how-to-get-a-cosmetology-license-in-texas`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/how-to-get-a-cosmetology-license-in-texas` },
};

export default function HowToGetCosmetologyLicenseTexasLayout({ children }: { children: React.ReactNode }) {
  return children;
}
