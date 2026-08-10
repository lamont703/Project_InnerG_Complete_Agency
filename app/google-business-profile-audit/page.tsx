import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PublicAuditTool } from "@/components/tools/public-audit-tool";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

/**
 * The free audit tool — the destination the money page's CTAs point at.
 *
 * Separate URL rather than a section of /google-business-profile-optimization
 * because the intent differs and so does the term: "google business profile
 * audit" (140/mo) and "local seo audit" (320/mo) are audit-intent searches,
 * while the money page owns "google business profile optimization" (6,600/mo).
 * Two pages, two intents, no cannibalisation — they interlink rather than
 * compete.
 *
 * Deliberately asks for nothing up front. The old flow sent "get my free audit"
 * clicks straight to a signup form, which inverts the exchange: the visitor came
 * to receive something and was immediately asked to give. Here the value lands
 * first and the account is asked for once they've seen their own number.
 */

const SITE = SITE_URL;

export const metadata: Metadata = {
  title: "Free Google Business Profile Audit | Barbershops, Salons & Schools",
  description:
    "Free Google Business Profile audit for barbershops, salons, schools and beauty supply stores. Score your listing against others in your city — photos, reviews, hours and more. No account needed.",
  keywords: [
    "google business profile audit",
    "local seo audit",
    "free google business profile audit",
    "google my business audit",
    "how to rank higher on google maps",
  ],
  alternates: { canonical: `${SITE}/google-business-profile-audit` },
  openGraph: {
    title: "Free Google Business Profile Audit",
    description:
      "Score your Google listing against other shops in your city. No account, no email — type your business name and see where you stand.",
    url: `${SITE}/google-business-profile-audit`,
    type: "website",
  },
};

export default function PublicAuditPage() {
  const jsonLd = graph(
            {
            "@type": "WebApplication",
            "@id": `${SITE_URL}/google-business-profile-audit#webapplication`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
    name: "Free Google Business Profile Audit",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${SITE}/google-business-profile-audit`,
    description:
      "Scores a barbershop, salon, school or beauty supply store's public Google listing on photos, reviews, hours, website and phone, benchmarked against other listings in the same city.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    provider: { "@type": "Organization", name: "ShearQuery by Inner G Complete Agency", url: SITE },
  },
          );

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto max-w-3xl px-5 pt-28 pb-16 sm:px-6">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
          <ShieldCheck className="h-3 w-3" /> Free · no account needed
        </span>

        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          {"Free Google Business Profile audit "}
          <span className="block text-primary">for barbershops, salons &amp; schools</span>
        </h1>

        <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">
          Type your business name. We&apos;ll score what&apos;s publicly visible on your Google
          listing — photos, reviews, hours, website, phone — and compare it against other listings
          in your city from our directory of thousands of barbershops, salons, schools and supply
          stores.
        </p>

        <div className="mt-8">
          <PublicAuditTool />
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-black">Why some of it needs your permission</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Google shows everyone your photos, reviews and hours — so we can score those without
            asking you for anything. But your profile attributes, your services, your description,
            and the actual search queries that surfaced your listing are only visible to the profile
            owner. That&apos;s Google&apos;s rule, not ours. Connecting is read-only, takes a minute,
            and you can disconnect whenever you like.
          </p>
          <Link
            href="/google-business-profile-optimization"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
          >
            See what the full audit covers and what it costs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
