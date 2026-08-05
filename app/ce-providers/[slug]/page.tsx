import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  MapPin, Phone, Globe, ShieldCheck, AlertTriangle, ExternalLink,
  ArrowRight, BadgeCheck, XCircle, Users,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";

/**
 * A Texas continuing-education provider.
 *
 * WHAT THIS PAGE IS FOR. A licensee needs 4 hours to renew and is choosing
 * between providers offering the identical state-mandated course for $5 to $24.
 * TDLR's own list gives 235 names in alphabetical order and nothing else. This
 * page answers the three things that actually decide it: is the licence live,
 * what does it cost, and is this an independent business or one of twenty
 * registrations belonging to a single operator.
 *
 * THE CONSOLIDATION IS SURFACED, NOT HIDDEN. One operator holds 20 CE licences
 * across 20 Texas cities on a single 888 number, with names engineered to sort
 * first alphabetically — "0 0 ONLINE LICENSE RENEWALS", "000ACE", "1 A ACADEMY".
 * Eight share one address in Abbott, a town of about 300 people. A directory
 * that renders each of those as an independent local provider would be
 * repeating the misdirection rather than correcting it, so
 * address_provider_count and the shared phone get their own callout.
 *
 * PRICE USES THE MINIMUM ONLY. price_max_usd is unreliable: several providers
 * are barber-supply businesses that also hold a CE licence, so the top figure
 * scraped from their homepage is merchandise rather than a course fee.
 */

export const revalidate = 3600;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SELECT =
  "slug, name, owner_name, license_number, license_expiration_date, is_active, " +
  "street_address, address_unit, city, state, zip, county, formatted_address, " +
  "phone, website, website_verdict, website_title, price_min_usd, mentions_tdlr, " +
  "address_provider_count, latitude, longitude";

async function getProvider(slug: string) {
  const { data } = await supabase
    .from("agent_texas_ce_provider_leads")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();
  return data as any;
}

/** Other licences registered at the same street address, or sharing the phone. */
async function getSiblings(p: any) {
  if (!p) return [];
  const { data } = await supabase
    .from("agent_texas_ce_provider_leads")
    .select("slug, name, city, is_active")
    .or(`street_address.eq.${p.street_address ?? "__none__"},phone.eq.${p.phone ?? "__none__"}`)
    .neq("slug", p.slug)
    .limit(30);
  return (data as any[]) || [];
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getProvider(slug);
  if (!p) return { title: "Provider not found" };

  const price = p.price_min_usd != null ? ` from $${p.price_min_usd}` : "";
  const status = p.is_active ? "Active" : "Expired";
  const title = `${p.name} — Texas CE Provider (Licence ${p.license_number})`;
  const description =
    `${status} TDLR continuing education provider licence ${p.license_number} in ${p.city}, Texas${price}. ` +
    `Licence status, address and course pricing for the 4 hours Texas requires to renew.`;
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `https://agency.innergcomplete.com/ce-providers/${p.slug}` },
    // An expired licence is a page worth keeping — someone searching the name
    // deserves to learn it lapsed — but it should not be promoted.
    robots: p.is_active ? undefined : { index: false, follow: true },
  };
}

export default async function CeProviderPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const p = await getProvider(slug);
  if (!p) notFound();
  const siblings = await getSiblings(p);

  const shared = (p.address_provider_count ?? 1) > 1 || siblings.length > 0;
  const expires = p.license_expiration_date
    ? new Date(p.license_expiration_date).toISOString().slice(0, 10)
    : null;

  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 pb-16">
        <Link
          href="/directory/ce-providers"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 hover:underline"
        >
          All CE providers
        </Link>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black ${
              p.is_active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}
          >
            {p.is_active ? <BadgeCheck className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {p.is_active ? "Licence active" : "Licence expired"}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            TDLR licence {p.license_number}
            {expires ? ` · expires ${expires}` : ""}
          </span>
        </div>

        <h1 className="mb-3 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          {p.name}
        </h1>

        <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600">
          A TDLR-licensed continuing education provider in {p.city}, Texas. Texas requires{" "}
          <strong className="text-slate-900">4 hours of continuing education</strong> to renew a
          barbering or cosmetology licence.
        </p>

        {!p.is_active ? (
          <div className="mb-8 rounded-2xl border border-rose-300 bg-rose-50 px-6 py-5">
            <p className="flex items-start gap-2 text-sm leading-relaxed text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>This provider&apos;s licence has expired</strong>
                {expires ? ` (${expires})` : ""}. Hours from an unlicensed provider may not count
                toward renewal. Confirm current status with TDLR before paying.
              </span>
            </p>
          </div>
        ) : null}

        {/* ---- The facts a licensee is choosing on --------------------------- */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Course price</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">
              {p.price_min_usd != null ? `from $${p.price_min_usd}` : "not published"}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {p.price_min_usd != null ? "lowest price found on their site" : "no price on their homepage"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Names TDLR</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{p.mentions_tdlr ? "Yes" : "No"}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {p.mentions_tdlr ? "the regulator appears on their site" : "their site never mentions the regulator"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">County</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{p.county || "—"}</p>
            <p className="mt-0.5 text-xs text-slate-400">as registered with TDLR</p>
          </div>
        </div>

        {/* ---- The consolidation callout ------------------------------------- */}
        {shared ? (
          <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 px-6 py-6">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-amber-900">
              <Users className="h-4.5 w-4.5" />
              This licence is not the only one at this address or number
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-amber-900/90">
              {p.address_provider_count > 1
                ? `${p.address_provider_count} CE provider licences are registered at ${p.street_address}, ${p.city}. `
                : ""}
              Several Texas CE providers trade under multiple names from one operation &mdash; one
              holds 20 licences across 20 cities on a single phone number. Worth knowing before you
              treat these as competing choices.
            </p>
            <div className="flex flex-wrap gap-2">
              {siblings.slice(0, 12).map((s) => (
                <Link
                  key={s.slug}
                  href={`/ce-providers/${s.slug}`}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
                >
                  {s.name}
                  {!s.is_active ? " (expired)" : ""}
                </Link>
              ))}
              {siblings.length > 12 ? (
                <span className="px-2 py-1.5 text-xs font-semibold text-amber-800">
                  +{siblings.length - 12} more
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ---- Contact ------------------------------------------------------- */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-900">Registered details</h2>
          <dl className="space-y-3 text-sm">
            {p.formatted_address ? (
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="font-black text-slate-900">Address on file with TDLR</dt>
                  <dd className="text-slate-600">{p.formatted_address}</dd>
                </div>
              </div>
            ) : null}
            {p.phone ? (
              <div className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="font-black text-slate-900">Phone</dt>
                  <dd>
                    <a href={`tel:${String(p.phone).replace(/[^0-9+]/g, "")}`} className="text-indigo-600 hover:underline" data-ig-click="outbound_lead">
                      {p.phone}
                    </a>
                  </dd>
                </div>
              </div>
            ) : null}
            {p.website ? (
              <div className="flex gap-3">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="font-black text-slate-900">Website</dt>
                  <dd>
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline" data-ig-click="outbound_lead">
                      {p.website.replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {p.website_title ? <span className="ml-2 text-xs text-slate-400">&ldquo;{p.website_title}&rdquo;</span> : null}
                  </dd>
                </div>
              </div>
            ) : null}
            {p.owner_name && p.owner_name !== p.name ? (
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <dt className="font-black text-slate-900">Registered owner</dt>
                  <dd className="text-slate-600">{p.owner_name}</dd>
                </div>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="mb-10 grid gap-3 sm:grid-cols-2">
          {[
            { href: "/directory/ce-providers", label: "Compare all Texas CE providers", why: "235 licensed providers, with price where we could verify it." },
            { href: "/barber-cos-continuing-education", label: "What the 4 hours must cover", why: "The required subjects, and what TDLR expects of an approved course." },
            { href: "/texas-barber-license-renewal", label: "Barber licence renewal", why: "The $50 fee, the 2-year term, and the late bands." },
            { href: "/texas-cosmetology-license-renewal", label: "Cosmetology licence renewal", why: "The same, on the cosmetology side." },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300">
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">{l.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{l.why}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
            </Link>
          ))}
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Licence details from the Texas Department of Licensing and Regulation. Pricing was read
          from the provider&apos;s own website and is the lowest figure found &mdash; confirm before
          paying, and confirm the licence is current at{" "}
          <a href="https://www.tdlr.texas.gov/LicenseSearch/" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            tdlr.texas.gov
          </a>
          .
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            name: p.name,
            url: `https://agency.innergcomplete.com/ce-providers/${p.slug}`,
            ...(p.website ? { sameAs: [p.website] } : {}),
            ...(p.phone ? { telephone: p.phone } : {}),
            address: {
              "@type": "PostalAddress",
              streetAddress: [p.street_address, p.address_unit].filter(Boolean).join(", ") || undefined,
              addressLocality: p.city || undefined,
              addressRegion: p.state || "TX",
              postalCode: p.zip || undefined,
              addressCountry: "US",
            },
            identifier: {
              "@type": "PropertyValue",
              name: "TDLR continuing education provider licence",
              value: p.license_number,
            },
          }),
        }}
      />
    </div>
  );
}
