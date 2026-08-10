import Link from "next/link"
import { getRenewalStats } from "@/lib/tdlr-renewal-stats"
import { RenewalLanding, type RenewalConfig } from "@/components/renewal/renewal-landing"
import { SITE_URL } from "@/lib/site";

export const revalidate = 86400 // refresh live renewal counts daily

export const metadata = {
  title: "Texas Barber License Renewal (2026): CE Hours, Fee & Steps",
  description:
    "Renew your Texas Class A Barber license: the $50 fee, 2-year cycle, 4 required CE hours (2 if licensed 15+ years), and the exact step-by-step renewal process through TDLR. Sourced from TDLR, with live renewal counts.",
  keywords: [
    "texas barber license renewal",
    "tdlr barber license renewal",
    "renew barber license texas",
    "texas barber license renewal fee",
    "texas barber continuing education requirements",
    "class a barber renewal texas",
    "how to renew barber license texas",
  ],
  openGraph: {
    title: "Texas Barber License Renewal (2026): CE Hours, Fee & Steps",
    description:
      "The $50 fee, 2-year cycle, 4 CE hours, and step-by-step renewal for a Texas Class A Barber license — sourced from TDLR.",
  },
  alternates: { canonical: `${SITE_URL}/texas-barber-license-renewal` },
}

const config: RenewalConfig = {
  path: "/texas-barber-license-renewal",
  license: "Barber",
  h1: "Texas Barber License Renewal",
  intro:
    "Everything a Texas Class A Barber needs to renew on time — the fee, the 2-year cycle, your required continuing-education hours, and the exact step-by-step process through TDLR.",
  ceIntro:
    "Since September 1, 2025, every barber must complete continuing education to renew. The requirement scales down the longer you've been licensed:",
  ceTopicUnder15: "1 hour sanitation, 1 hour human trafficking prevention, 2 hours barbering topics.",
  ceTopicOver15: "1 hour sanitation, 1 hour human trafficking prevention.",
  steps: [
    {
      t: "Complete your required CE hours",
      d: (
        <>
          4 hours (or 2 if you&apos;ve held your barber license 15+ years) from a TDLR-approved provider. Get them at
          our{" "}
          <Link href="/barber-cos-continuing-education" className="text-indigo-600 font-bold hover:underline">
            Texas Barber &amp; Cosmetology CE portal
          </Link>
          .
        </>
      ),
    },
    { t: "Confirm your hours were reported", d: "Approved providers report completed CE to TDLR electronically, usually within 1 business day. Verify it posted using TDLR's License Search before you renew." },
    { t: "Log in to TDLR Online Services", d: "Open your account at tdlr.texas.gov and start the renewal application for your Class A Barber license." },
    { t: "Provide lawful-presence documents and pay", d: "From May 1, 2026, upload proof of lawful presence, then pay your $50 on-time renewal fee." },
    { t: "Submit and save your license", d: "Submit the application and download your updated barber license once it's issued." },
  ],
  faqs: [
    { q: "How much does it cost to renew a Texas barber license?", a: "The TDLR renewal fee for a Class A Barber is $50 on time. If your license has expired, it rises to $75 (under 18 months late) or $100 (18 months to 3 years late). Past 3 years you generally can't renew and must re-establish eligibility. The fee is separate from the ~$25 you pay a provider for your CE hours." },
    { q: "How many CE hours do I need to renew my Texas barber license?", a: "4 hours from a TDLR-approved provider — 1 hour sanitation, 1 hour human trafficking prevention, and 2 hours of barbering topics. If you've held your license 15 or more years, it drops to 2 hours (sanitation + human trafficking). Barbers who are 65+ and licensed 15+ years need only the 1-hour sanitation course." },
    { q: "How often do I renew my Texas barber license?", a: "Every 2 years from your date of issue. TDLR renews online, and you should start about 60 days before your expiration date so your CE hours are reported in time." },
    { q: "How long does barber license renewal take to process?", a: "Online renewals through TDLR typically process in about 7-10 business days; renewing by mail takes roughly 4-6 weeks. CE hours from an approved provider are reported to TDLR within about 1 business day." },
    { q: "What if my Texas barber license already expired?", a: "You can still renew late — $75 if expired under 18 months, $100 if 18 months to 3 years. Beyond 3 years, TDLR requires meeting the requirements for an initial license again, including exams and fees." },
  ],
  siblingHeading: "Getting licensed or preparing for the exam?",
  siblingLinks: [
    { href: "/how-to-get-a-barber-license-in-texas", label: "How to get a barber license" },
    { href: "/texas-barber-exam-intelligence-prep", label: "Barber written exam prep" },
    { href: "/texas-barber-practical-exam-kit-list", label: "Practical exam kit list" },
    // The fees, CE hours and deadlines above are point-in-time facts. When TDLR
    // moves one, the dated entry lands on the update log before this page is
    // rewritten — so send readers somewhere that is definitionally current.
    { href: "/texas-tdlr-updates", label: "Latest TDLR rule changes" },
  ],
}

const FALLBACK = { totalLicensed: 30405, renewalsDue90d: 3314 }

export default async function TexasBarberLicenseRenewalPage() {
  const stats = await getRenewalStats(["Class A Barber"], FALLBACK)
  return <RenewalLanding config={config} stats={stats} />
}
