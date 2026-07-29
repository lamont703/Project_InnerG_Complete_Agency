import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, MapPin, Scissors, Search, Store, Users } from "lucide-react";

/**
 * Shared layout for the trade-side job postings (barber, cosmetologist).
 *
 * These are different animals from the agency's engineering roles: we aren't
 * hiring these people onto our own payroll — we're recruiting them for the
 * shops and salons already listed on ShearQuery. The copy has to be honest
 * about that, because a professional who turns up expecting to be employed by
 * an agency and finds a chair rental has been misled.
 *
 * They're also an SEO play. Someone searching "barbershops hiring in Houston"
 * is the exact person these shops want, so the page is a server component with
 * real metadata and JobPosting structured data — the existing engineering role
 * pages are client components with neither, which is fine for roles nobody
 * googles by city and wrong for these.
 *
 * The conversion is /membership, not an application form. A listing on the
 * platform is what a professional actually uses to approach shops, so the page
 * pushes them to create their profile rather than into an inbox.
 */

export interface TradeRole {
  slug: string;
  /** The searched phrase, used as the headline. */
  headline: string;
  subhead: string;
  licenseLabel: string;
  /** One-line statement of who this role is and isn't, versus its sibling. */
  distinction: string;
  siblingHref: string;
  siblingLabel: string;
  venueNoun: string; // "barbershops" / "hair and beauty salons"
  dayToDay: string[];
  requirements: string[];
  niceToHave: string[];
  /** JobPosting title — plainer than the SEO headline. */
  jobTitle: string;
  jobDescription: string;
  occupationalCategory: string;
}

const SITE = "https://agency.innergcomplete.com";

export function TradeRolePosting({ role }: { role: TradeRole }) {
  // Google for Jobs. hiringOrganization is us because we do the recruiting and
  // the placement; the actual chair or booth belongs to a shop on the platform,
  // which the description states plainly rather than implying we're the employer.
  const jobPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: role.jobTitle,
    description: role.jobDescription,
    datePosted: "2026-07-29",
    validThrough: "2027-01-31",
    employmentType: ["FULL_TIME", "PART_TIME", "CONTRACTOR"],
    hiringOrganization: {
      "@type": "Organization",
      name: "ShearQuery by Inner G Complete Agency",
      sameAs: SITE,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Houston",
        addressRegion: "TX",
        addressCountry: "US",
      },
    },
    occupationalCategory: role.occupationalCategory,
    directApply: false,
    url: `${SITE}/careers/${role.slug}`,
  };

  return (
    <main className="min-h-screen bg-background light text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
      />

      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="mx-auto max-w-4xl px-6">
          <Link
            href="/careers"
            className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Careers
          </Link>

          <header className="mb-10">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                Now Recruiting
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <MapPin className="h-3 w-3 text-primary" /> Houston &amp; Greater Houston
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <BadgeCheck className="h-3 w-3 text-primary" /> {role.licenseLabel}
              </div>
            </div>

            <h1 className="text-4xl font-bold uppercase italic leading-tight tracking-tight text-foreground sm:text-5xl">
              {role.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{role.subhead}</p>
          </header>

          {/* The two-sided model, said plainly. A professional deserves to know
              who they'd actually be working for before they read a requirements
              list. */}
          <section className="mb-10 rounded-2xl border border-border bg-secondary/20 p-6">
            <h2 className="mb-3 text-lg font-black text-foreground">Who you&apos;d actually be working for</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              ShearQuery is a directory of {role.venueNoun} across Texas. Shops and salons on the platform tell us when
              they have chairs, booths, or staff positions open, and we match licensed professionals to them.{" "}
              <strong className="font-semibold text-foreground">
                You are not being hired by the agency — you&apos;re being placed with a shop.
              </strong>{" "}
              Pay structure depends on the shop: some hire hourly or salaried, many rent chairs or booths, and some
              work on commission. We tell you which is which before you ever walk in.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{role.distinction}</p>
          </section>

          {/* Primary conversion. Placed high — this is the action, not the
              application form at the bottom of a normal job post. */}
          <section className="mb-10 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:flex">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground">Start with a listing, not a résumé</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Shops on ShearQuery look at profiles, not CVs. Join the free community membership and create your
                  professional listing — your license status, specialties, and where you work. That listing is what you
                  use to approach shops and salons, and it&apos;s what they look at when they have a chair to fill. If
                  you&apos;re already in our directory, you&apos;ll be offered the option to claim that profile instead.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/membership"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Create your free listing
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/compare-shops"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary/50"
                  >
                    <Search className="h-4 w-4 text-primary" />
                    Compare shops first
                  </Link>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Free, no cost to the professional. Membership takes about a minute.{" "}
                  <Link href="/account/add-professional" className="font-semibold text-primary underline">
                    Already a member? Add your listing
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>

          <div className="grid gap-8 sm:grid-cols-2">
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-foreground">
                <Scissors className="h-4 w-4 text-primary" /> The work
              </h2>
              <ul className="space-y-2.5">
                {role.dayToDay.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-foreground">
                <BadgeCheck className="h-4 w-4 text-primary" /> What you need
              </h2>
              <ul className="space-y-2.5">
                {role.requirements.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-primary">Nice to have, not required</p>
              <ul className="mt-2 space-y-1.5">
                {role.niceToHave.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground">
                    · {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Experience band, stated explicitly so a recent graduate doesn't
              self-select out and a 20-year veteran isn't misled about the level. */}
          <section className="mt-10 rounded-2xl border border-border p-6">
            <h2 className="mb-2 text-lg font-black text-foreground">Experience level: entry to mid</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Most of the openings we&apos;re filling suit{" "}
              <strong className="font-semibold text-foreground">0–3 years behind the chair</strong>, including new
              graduates and professionals who just passed their state boards. A few shops want someone with an
              established book of clients — those are marked as such when we match you. If you&apos;re still finishing
              hours, create your listing now; several shops take apprentices and will hold a chair for a licensed
              start date.
            </p>
          </section>

          <section className="mt-10 rounded-2xl border border-border bg-secondary/20 p-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-foreground">
              <Store className="h-4 w-4 text-primary" /> Do your homework before you commit
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A chair is a business decision. Our{" "}
              <Link href="/compare-shops" className="font-semibold text-primary underline">
                shop comparison tool
              </Link>{" "}
              puts booth rent, chair availability, ratings, and amenities side by side, so you can see what a shop
              actually charges before you sit down with the owner. We built it because most professionals find this out
              too late.
            </p>
          </section>

          <section className="mt-10 border-t border-border pt-8">
            <p className="text-sm text-muted-foreground">
              Licensed for the other side of the trade?{" "}
              <Link href={role.siblingHref} className="font-bold text-primary underline">
                {role.siblingLabel}
              </Link>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Own a shop or salon and need staff?{" "}
              <Link href="/membership" className="font-bold text-primary underline">
                Claim your listing
              </Link>{" "}
              and tell us what you&apos;re hiring for.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
