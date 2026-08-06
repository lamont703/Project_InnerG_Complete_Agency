import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

// "use client" page with no metadata of its own — was silently inheriting
// the root layout's generic homepage title/description.
export const metadata: Metadata = {
  title: "Accreditation Relationship Auditor™ | Title IV Risk Tracking",
  description:
    "Institutional relationship auditing for Texas barber schools — tracks instructional fidelity and Title IV risk level to help protect NACCAS accreditation before a compliance drop happens.",
  keywords: [
    "Title IV risk barber school",
    "NACCAS accreditation auditor",
    "barber school compliance tool",
    "instructional fidelity tracking",
  ],
  openGraph: {
    title: "Accreditation Relationship Auditor™ | Title IV Risk Tracking",
    description:
      "Institutional relationship auditing for Texas barber schools — tracks instructional fidelity and Title IV risk level.",
  },
  alternates: {
    canonical: `${SITE_URL}/tools/texas-barber-school-accreditation-relationship-auditor`,
  },
};

export default function AccreditationAuditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
