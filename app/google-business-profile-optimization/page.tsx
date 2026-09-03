import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, BadgeCheck, CalendarClock, ChartNoAxesColumn, CheckCircle2,
  GraduationCap, Image as ImageIcon, MapPin, MessageSquare, Scissors, Search,
  ShieldAlert, Sparkles, Store, Users, XCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

/**
 * Money page for the local-SEO service.
 *
 * Targets "google business profile optimization" — 6,600 US searches/month per
 * Keyword Planner, against roughly 10/month for "barber seo" and no measurable
 * volume at all for "barbershop seo" or "seo for salons". So the head term owns
 * the title, URL and H1, and the trade specialisation does its work in the body
 * copy, where it qualifies the visitor and picks up the long tail without
 * costing us the volume.
 *
 * The check list below is not marketing invention — it mirrors the real audit in
 * lib/gbp-audit.ts, including the weightings. If that engine changes, this page
 * should change with it, because prospects are shown the same report.
 */

const SITE = SITE_URL;

/**
 * Pricing. Free audit, one-time implementation, optional monthly monitoring.
 *
 * The monitoring tier isn't an upsell bolted on — it's the honest shape of the
 * product. Profile edits queue for Google review, some get reverted, customers
 * suggest changes, and Google's own record drifts (our audit reads exactly that
 * via getGoogleUpdated). A one-time fee sells a snapshot of something that
 * decays; the monthly is what keeps the work from quietly undoing itself.
 *
 * LAUNCH_FREE_SLOTS is a fixed-count launch offer, not a live counter — the page
 * is statically rendered and nothing here checks how many have been claimed. So
 * it's worded as "the first N", which stays true as it fills, and this constant
 * is the single place to change when the offer ends. Set it to 0 to remove every
 * mention of the waiver from the page.
 */
const IMPLEMENTATION_PRICE = 397;
const MONITORING_PRICE = 97;
const LAUNCH_FREE_SLOTS = 5;

export const metadata: Metadata = {
  title: "Google Business Profile Optimization for Barbershops & Salons | ShearQuery",
  description:
    "Google Business Profile optimization for barbershops, salons, barber and cosmetology schools, supply stores, and individual barbers and stylists. We audit every profile attribute, your categories, services, photos and reviews — then show you the exact searches people used to find you.",
  keywords: [
    "google business profile optimization",
    "google my business optimization",
    "google business profile audit",
    "local seo audit",
    "how to rank higher on google maps",
    "gmb optimization service",
    "salon seo",
    "barbershop marketing",
  ],
  alternates: { canonical: `${SITE}/google-business-profile-optimization` },
  openGraph: {
    title: "Google Business Profile Optimization for Barbershops & Salons",
    description:
      "A read-only audit of your Google Business Profile — scored, prioritised, and specific to the beauty trade. See the searches that actually surfaced your listing.",
    url: `${SITE}/google-business-profile-optimization`,
    type: "website",
  },
};

/** Mirrors the four scoring areas in lib/gbp-audit.ts, weights included. */
const AUDIT_AREAS = [
  {
    name: "Foundation",
    weight: 35,
    icon: BadgeCheck,
    blurb: "The fields a listing is unusable without.",
    checks: [
      "Primary category — decides which searches you're eligible for at all",
      "Business description — most profiles leave it blank or use a fraction of the 750 characters",
      "Services — where locs, silk press, braiding and extensions live, because Google has no category for most of them",
      "Hours for every trading day, or you vanish from “open now”",
      "Website and primary phone",
    ],
  },
  {
    name: "Discovery",
    weight: 30,
    icon: Search,
    blurb: "What widens the set of searches you can appear in.",
    checks: [
      "All 48 attributes available to a hair salon — including identity attributes customers filter by",
      "Secondary categories: up to 9, and Loctician service and Hair extension technician are real ones most shops never add",
      "Holiday and special hours",
      "Booking and appointment links",
    ],
  },
  {
    name: "Engagement",
    weight: 20,
    icon: MessageSquare,
    blurb: "Freshness and responsiveness.",
    checks: [
      "Photo count and coverage — exterior, interior, finished work",
      "Post recency",
      "Review reply rate — unanswered five-star reviews are wasted goodwill",
    ],
  },
  {
    name: "Trust",
    weight: 15,
    icon: ShieldAlert,
    blurb: "Whether the listing is healthy enough to rank at all.",
    checks: [
      "Verification standing with Google",
      "Open status — a listing wrongly marked temporarily closed is heavily suppressed",
      "Whether Google's own record has quietly diverged from yours",
    ],
  },
];


/**
 * Audience breadth, added without touching the H1, title or URL — those target
 * "google business profile optimization" (6,600/mo) and that focus is what makes
 * the page rankable. Segment coverage belongs in the body, where it qualifies
 * the visitor and picks up incidental long tail. Splitting this into one page
 * per segment would be the mistake: the segment-named queries have no measurable
 * volume, and five thin pages would compete with each other for the head term.
 *
 * Every category name below was confirmed against Google's live taxonomy.
 */
const SEGMENTS = [
  {
    name: "Barbershops & salons",
    icon: Scissors,
    note: "The core case — Barber shop and Hair salon, with up to nine secondary categories most shops never touch.",
  },
  {
    name: "Barber & cosmetology schools",
    icon: GraduationCap,
    note: "Barber school and Beauty school are both real categories. Prospective students search the way any local buyer does, and enrollment is worth far more per lead than a haircut.",
  },
  {
    name: "Barber & beauty supply stores",
    icon: Store,
    note: "Barber supply store exists as a category; there is no beauty-supply equivalent, so picking the closest correct one is itself part of the work.",
  },
  {
    name: "Individual barbers & stylists",
    icon: Users,
    note: "Renting a chair or working mobile usually means a service-area profile with no public address — a different attribute set, and no direction requests to measure. The audit accounts for that instead of scoring you against a storefront.",
  },
];

const FAQS = [
  {
    q: "What is Google Business Profile optimization?",
    a: "It's the work of completing and correcting the profile that powers your listing in Google Maps and the local results — categories, services, attributes, hours, photos, description and reviews. Google decides which searches your business is eligible for largely from these fields, so blank ones remove you from searches you'd otherwise appear in.",
  },
  {
    q: "How do I rank higher on Google Maps?",
    a: "Relevance, distance and prominence are Google's stated factors. You can't move your shop, so the work is relevance (categories, services and attributes that match what people search) and prominence (reviews, replies, photos, and a profile Google trusts). Our audit scores exactly those and ranks the gaps by how much each is costing you.",
  },
  {
    q: "Do you need access to my Google account?",
    a: "For the full audit, yes — you connect your Google Business Profile and grant read access. Attributes, the search queries that surfaced your listing, and Google's pending edits are only visible to the profile owner. We can produce a partial audit from public data first if you'd rather see something before connecting.",
  },
  {
    q: "Will this get my listing suspended?",
    a: "Not from anything we do. We don't change business names and we don't stuff keywords into descriptions — those are the two most common causes of suspension, and both are commonly sold as “optimization”. Every change is proposed to you first, and we snapshot the profile before touching it so it can be put back.",
  },
  {
    q: "How long does it take to see results?",
    a: "Profile edits often queue for Google review and can take days to appear; some get reverted, which is why we monitor rather than edit once and walk away. Completeness changes — attributes, services, categories — take effect fastest. Review and photo work compounds over months.",
  },
  {
    q: "What does it cost?",
    a: `The audit is free, and the report is yours whether or not you go further. Implementation — filling the attributes, categories, services, description, hours and photo gaps the audit finds — is a one-time $${IMPLEMENTATION_PRICE} per location, and we're waiving it for the first ${LAUNCH_FREE_SLOTS} shops. Ongoing monitoring is $${MONITORING_PRICE} a month and is optional: Google reverts edits, customers suggest changes, and profiles drift, so monitoring is what stops the work undoing itself. You can take the implementation on its own.`,
  },
];

export default function GbpOptimizationPage() {
  const jsonLd = graph(
            {
            "@graph": [
      {
        "@type": "Service",
            "@id": `${SITE_URL}/google-business-profile-optimization#service`,
        name: "Google Business Profile Optimization for Barbershops and Salons",
        serviceType: "Local SEO",
        provider: {
          "@type": "Organization",
          name: "ShearQuery by Inner G Complete Agency",
          url: SITE,
        },
        areaServed: { "@type": "State", name: "Texas" },
        audience: {
          "@type": "BusinessAudience",
          name: "Barbershops, hair and beauty salons, barber and cosmetology schools, barber and beauty supply stores, and licensed barbers, cosmetologists and stylists",
        },
        description:
          "A read-only audit and optimization service for the Google Business Profile of barbershops, salons and beauty professionals — categories, services, attributes, hours, photos, reviews and search-query reporting.",
        url: `${SITE}/google-business-profile-optimization`,
        offers: [
          {
            "@type": "Offer",
            name: "Implementation",
            price: String(IMPLEMENTATION_PRICE),
            priceCurrency: "USD",
            description: "One-time Google Business Profile implementation, per location. The audit itself is free.",
          },
          {
            "@type": "Offer",
            name: "Monitoring",
            priceCurrency: "USD",
            description: "Optional ongoing monitoring — detects reverted edits, suggested changes and profile drift.",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: String(MONITORING_PRICE),
              priceCurrency: "USD",
              billingDuration: 1,
              billingIncrement: 1,
              unitCode: "MON",
            },
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  },
          );

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5 pt-28 pb-12 sm:px-6">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
          <MapPin className="h-3 w-3" /> Barbershops · Salons · Beauty Pros
        </span>

        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
          {/* Explicit trailing space in a string literal, not a bare newline: the
              .md twin for AI crawlers builds its H1 from the text nodes, and JSX
              drops whitespace across a line break — which rendered as
              "Optimizationfor barbershops". */}
          {"Google Business Profile Optimization "}
          <span className="block text-primary">for barbershops, salons &amp; beauty pros</span>
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          Your Google profile decides whether you show up when someone nearby searches
          &ldquo;barber shops near me&rdquo;. Most profiles in this trade are missing the fields that
          decide it — not because owners are careless, but because Google buries them. We audit
          every one of those fields, score what&apos;s missing, and hand you the fix list in priority
          order.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/google-business-profile-audit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get my free profile audit <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#what-we-check"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-black uppercase tracking-wide text-slate-700 transition-colors hover:bg-slate-50"
          >
            See what we check
          </a>
        </div>

        <p className="mt-4 text-sm font-bold text-slate-700">
          Free audit · ${IMPLEMENTATION_PRICE} implementation —{" "}
          <span className="text-primary">free for the first {LAUNCH_FREE_SLOTS} shops.</span>{" "}
          <span className="font-semibold text-slate-500">Monitoring ${MONITORING_PRICE}/mo, optional.</span>
        </p>
        <p className="mt-1.5 text-xs text-slate-500">
          The audit is read-only. Nothing on your profile changes without your say-so.
        </p>
      </section>

      {/* The specific gap */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6">
          <h2 className="text-2xl font-black tracking-tight">
            Google gives a hair salon 48 attributes. Most profiles set a handful.
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">
            Attributes are the checkboxes behind your listing — wheelchair accessible entrance,
            accepts walk-ins, appointment required, gender-neutral restroom, good for kids, free
            street parking. Several of them are <strong>filters customers actively use on Maps</strong>,
            including identity attributes like Black-owned, Latino-owned and LGBTQ+ friendly.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">
            An attribute you haven&apos;t set doesn&apos;t make you rank lower. It makes you{" "}
            <strong>invisible</strong> to everyone filtering for it. That&apos;s a customer who never sees
            you at all, and it takes about a minute to fix.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { k: "48", v: "attributes available to a hair salon", i: CheckCircle2 },
              { k: "9", v: "secondary categories most shops leave empty", i: Search },
              { k: "750", v: "description characters, usually mostly unused", i: MessageSquare },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <s.i className="h-5 w-5 text-primary" />
                <div className="mt-3 text-3xl font-black tabular-nums">{s.k}</div>
                <div className="mt-1 text-sm leading-snug text-slate-600">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we check */}
      <section id="what-we-check" className="mx-auto max-w-4xl px-5 py-14 sm:px-6">
        <h2 className="text-2xl font-black tracking-tight">What the audit checks</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
          Every check reports the number we actually found, so you can verify it yourself. Scores
          are a way of ranking the work — Google doesn&apos;t publish ranking weights, and anyone
          selling you a &ldquo;Google score&rdquo; as though it does is making it up.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {AUDIT_AREAS.map((area) => (
            <div key={area.name} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <area.icon className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-black">{area.name}</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {area.weight} pts
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{area.blurb}</p>
              <ul className="mt-4 space-y-2.5">
                {area.checks.map((c) => (
                  <li key={c} className="flex gap-2.5 text-sm leading-snug text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Segments. Deliberately below the fold and below the head-term content. */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:px-6">
          <h2 className="text-2xl font-black tracking-tight">Who this is for</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
            The same profile fields decide visibility for every business in this trade — but what
            belongs in them differs, and so does what&apos;s worth measuring.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {SEGMENTS.map((seg) => (
              <div key={seg.name} className="flex gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <seg.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-black text-slate-900">{seg.name}</h3>
                  <p className="mt-1.5 text-sm leading-snug text-slate-600">{seg.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search queries — the differentiator */}
      <section className="border-y border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:px-6">
          <ChartNoAxesColumn className="h-6 w-6 text-white" />
          <h2 className="mt-4 text-2xl font-black tracking-tight">
            The searches that actually surfaced your listing
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">
            Google records the queries people typed before your profile appeared. Most owners have
            never seen them. They&apos;re the difference between guessing at keywords and knowing —
            and they routinely surface demand nobody would have predicted, like Spanish-language
            searches in a neighbourhood you thought was English-speaking, or people finding you by a
            nearby landmark rather than your street.
          </p>
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-300">
            We also separate <strong className="text-white">branded</strong> searches — people who
            already knew your name — from <strong className="text-white">discovery</strong> searches.
            Only the second kind means your local SEO is working. Plenty of reports quietly count the
            first kind as a win.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-5 py-14 sm:px-6">
        <h2 className="text-2xl font-black tracking-tight">How it works</h2>
        <ol className="mt-8 space-y-6">
          {[
            {
              t: "Connect your Google Business Profile",
              d: "Read-only access. Attributes, search queries and Google's pending edits are only visible to the profile owner, which is why this step exists. You can disconnect at any time.",
              i: BadgeCheck,
            },
            {
              t: "We audit and score every field",
              d: "Foundation, Discovery, Engagement and Trust — with the real numbers behind each finding, and the gaps ordered by how much each one is costing you.",
              i: Search,
            },
            {
              t: "You get the report and the fix list",
              d: "Yours to keep, whether or not you hire us to implement it. Several items take minutes and you can do them yourself.",
              i: Sparkles,
            },
            {
              t: "Optional: we implement and monitor",
              d: "Google reverts edits, customers suggest changes, and categories shift. Monitoring is what keeps the work from quietly undoing itself.",
              i: CalendarClock,
            },
          ].map((step, i) => (
            <li key={step.t} className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                {i + 1}
              </div>
              <div>
                <h3 className="font-black">{step.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Pricing — stated plainly. Hiding it filters out buyers and attracts
          tyre-kickers, and this price is low enough to be an argument in itself. */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:px-6">
          <h2 className="text-2xl font-black tracking-tight">Pricing</h2>
          <div className="mt-7 grid gap-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">The audit</div>
              <div className="mt-2 text-4xl font-black">Free</div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Your score, every finding with the real number behind it, the prioritised fix list,
                and the searches people used to find you. Yours to keep and act on yourself.
              </p>
            </div>

            <div className="relative rounded-2xl border-2 border-primary/40 bg-primary/5 p-6">
              {LAUNCH_FREE_SLOTS > 0 && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
                  First {LAUNCH_FREE_SLOTS} shops free
                </span>
              )}
              <div className="text-[10px] font-black uppercase tracking-widest text-primary/70">Implementation</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-black">${IMPLEMENTATION_PRICE}</span>
                <span className="text-sm font-semibold text-slate-500">one-time, per location</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                We do the work: attributes, categories, services, description, hours, and uploading
                the photos you supply. Snapshot taken first, every change reversible.
              </p>
              {LAUNCH_FREE_SLOTS > 0 && (
                <p className="mt-3 text-sm font-bold text-primary">
                  We&apos;re waiving this for the first {LAUNCH_FREE_SLOTS} shops — the audit and the
                  implementation both cost nothing.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monitoring</div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-black">${MONITORING_PRICE}</span>
                <span className="text-sm font-semibold text-slate-500">/mo, optional</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Profiles don&apos;t stay fixed. Google reverts edits, customers suggest changes, and
                Google&apos;s own record drifts from yours. We watch for it, re-check monthly, and tell
                you what moved.
              </p>
            </div>
          </div>
          <p className="mt-5 text-xs text-slate-500">
            Photos are the one thing we can&apos;t do for you — you supply the images, we handle the
            upload and everything else.
          </p>
        </div>
      </section>

      {/* Trust / anti-pitch */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:px-6">
          <h2 className="text-2xl font-black tracking-tight">What we won&apos;t do</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
            A suspended listing disappears from Maps entirely and can take weeks to reinstate. Some
            of what gets sold as optimization is exactly what triggers it.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {[
              { t: "Change your business name", d: "Adding keywords to the name is the single most common cause of suspension. We won't touch it." },
              { t: "Stuff keywords into your description", d: "It reads badly to customers and risks the listing. We write descriptions people can actually read." },
              { t: "Edit anything without a snapshot", d: "We record the profile before any change, so every edit can be reversed." },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5">
                <XCircle className="h-5 w-5 text-rose-600" />
                <h3 className="mt-3 font-black text-slate-900">{x.t}</h3>
                <p className="mt-1.5 text-sm leading-snug text-slate-600">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-5 py-14 sm:px-6">
        <h2 className="text-2xl font-black tracking-tight">Questions</h2>
        <div className="mt-7 space-y-4">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer list-none font-bold text-slate-900 marker:hidden">
                {f.q}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Close */}
      <section className="mx-auto max-w-4xl px-5 pb-20 sm:px-6">
        <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-8 text-center sm:p-10">
          <ImageIcon className="mx-auto h-7 w-7 text-primary" />
          <h2 className="mt-4 text-2xl font-black tracking-tight">
            Find out what your profile is missing
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-slate-600">
            The audit is free and read-only. You&apos;ll see your score, the prioritised fix list, and
            the searches people used to find you — whether or not you work with us afterwards.
            {LAUNCH_FREE_SLOTS > 0 && (
              <> And for the first {LAUNCH_FREE_SLOTS} shops, we&apos;ll do the ${IMPLEMENTATION_PRICE}{" "}
              implementation free too.</>
            )}
          </p>
          <Link
            href="/google-business-profile-audit"
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get my free profile audit <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-6 text-sm text-slate-500">
            Already listed with us?{" "}
            <Link href="/account/manage-listing" className="font-bold text-primary hover:underline">
              Connect Google from your listing
            </Link>{" "}
            · Comparing shops instead?{" "}
            <Link href="/compare-shops" className="font-bold text-primary hover:underline">
              Compare barbershops
            </Link>
          </p>
        </div>
      </section>

    </div>
  );
}
