import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

// "use client" page with no metadata of its own — was silently inheriting
// the root layout's generic homepage title/description.
export const metadata: Metadata = {
  title: "Instructor Intelligence Dashboard™ | NACCAS Compliance",
  description:
    "Class-level pass-rate prediction, student confidence tracking, and at-risk pupil alerts for Texas barber school instructors — built to protect NACCAS accreditation and Title IV eligibility.",
  keywords: [
    "barber school instructor dashboard",
    "NACCAS compliance tool",
    "barber class pass rate prediction",
    "Texas barber school accreditation",
  ],
  openGraph: {
    title: "Instructor Intelligence Dashboard™ | NACCAS Compliance",
    description:
      "Class-level pass-rate prediction and at-risk pupil alerts for Texas barber school instructors — built to protect NACCAS accreditation.",
  },
  alternates: {
    canonical: `${SITE_URL}/tools/texas-barber-instructor-intelligence-dashboard`,
  },
};

export default function InstructorDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
