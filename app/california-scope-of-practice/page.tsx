import Link from "next/link";
import { ArrowRight, Ban, Scissors, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { CA_TRAINING_HOURS } from "@/lib/ca-sources";

/**
 * What each California licence actually permits — the scope reference.
 *
 * WHY A SEPARATE PAGE WHEN SIX LICENCE GUIDES ALREADY EXIST. The guides answer
 * "how do I get licensed"; this answers "what am I allowed to do", and the
 * board treats those as different questions too — it publishes standalone
 * Scope of Practice flyers per licence rather than folding them into the
 * requirements pages.
 *
 * "Scope of practice" is also the BOARD'S term, which is the whole reason this
 * page exists in this form. The 28-day Search Console read was unambiguous:
 * pages named with a regulator's vocabulary earn traffic and pages named with
 * ours do not. "esthetician scope of practice" and "cosmetology scope of
 * practice" carry real volume; "exam prep", "leaderboard" and "intelligence
 * prep" — our inventions — returned zero impressions on a domain doing 390k.
 *
 * THE COMPARISON IS THE ARTIFACT. Any one licence's scope is on a board flyer.
 * What is nowhere is the six of them side by side, which is the only form that
 * answers the question people actually have: which licence covers the work I
 * want to do. Three boundaries do the real work and none are guessable —
 * shaving sits in barbering and not cosmetology, nails sit in cosmetology and
 * not barbering, and hairstyling excludes every chemical service.
 *
 * SOURCING. All of it is BPC 7316, read 2026-08-10, plus 7320.5 for the laser
 * prohibition. Quoted only where the exact statutory wording carries the
 * meaning — "electric needle only", "nonchemically", "ablation or destruction
 * of the live tissue" — because paraphrasing those loses the boundary.
 */

const TITLE = "California Scope of Practice: What Each License Allows";
const DESCRIPTION =
  "What California's six barbering and cosmetology licences each permit — and the three boundaries between them that nobody guesses right, from BPC 7316.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-scope-of-practice`;

const hours = (name: string) => CA_TRAINING_HOURS.find((h) => h.license === name)!.hours;

const SCOPES = [
  {
    licence: "Cosmetologist",
    hrs: hours("Cosmetology"),
    href: "/california-cosmetology-license",
    section: "7316(b)",
    can: [
      "All hair services — cutting, colouring, bleaching, tinting, straightening, permanent waving, relaxing, shampooing and styling",
      "Massaging, cleansing and stimulating the scalp, face, neck, arms and upper body",
      "Beautifying the face, neck, arms and upper body with cosmetic preparations",
      "Removing superfluous hair by depilatory, tweezers, chemicals or devices",
      "Nails — cutting, trimming, polishing, tinting, colouring, cleansing, manicuring",
      "Massaging, cleansing, treating and beautifying the hands and feet",
    ],
    cannot: ["Shaving — it is not enumerated here", "Lasers or light waves for hair removal", "Electrolysis"],
  },
  {
    licence: "Barber",
    hrs: hours("Barbering"),
    href: "/california-barber-license",
    section: "7316(a)",
    can: [
      "Shaving or trimming the beard, and cutting the hair",
      "Facial and scalp massage and treatments, by hand or mechanical appliance",
      "Singeing, shampooing, arranging, dressing, curling, waving, chemical waving, hair relaxing and dyeing",
      "Applying cosmetic preparations, antiseptics, powders, oils, clays or lotions to the scalp, face or neck",
      "Hairstyling of all textures by current standard methods",
    ],
    cannot: ["Nail work", "Treating the hands and feet", "Hair removal (waxing, depilatories, tweezing)"],
  },
  {
    licence: "Esthetician",
    hrs: hours("Esthetician (Skin Care)"),
    href: "/california-esthetician-license",
    section: "7316(c)",
    can: [
      "Facials, massage, stimulation, exfoliation, cleansing and beautifying of the face, scalp, neck, hands, arms, feet, legs and upper body",
      "Tinting and perming eyelashes and brows, and applying lashes",
      "Hair removal by depilatory, tweezers, sugaring, nonprescription chemical, waxing or device",
    ],
    cannot: [
      "Anything resulting in “the ablation or destruction of the live tissue”",
      "Lasers or light waves — a misdemeanour under BPC 7320.5",
      "Hair services, nail services",
    ],
  },
  {
    licence: "Hairstylist",
    hrs: hours("Hairstylist"),
    href: "/california-hairstylist-license",
    section: "7316(h)",
    can: [
      "Styling all textures of hair by current standard methods",
      "Arranging, blow drying, cleansing, curling, cutting, dressing, extending, shampooing and waving",
      "“Nonchemically” straightening the hair, using electrical and non-electrical devices",
    ],
    cannot: [
      "Haircolour, bleach, tint or dye",
      "Permanent waving or chemical relaxing",
      "Skin care, nails, hair removal",
    ],
  },
  {
    licence: "Manicurist",
    hrs: hours("Manicurist (Nail Care)"),
    href: "/california-nail-technician-license",
    section: "7316(d)",
    can: [
      "Trimming, polishing, colouring, tinting, cleansing, manicuring and pedicuring the nails",
      "Massaging, cleansing and beautifying from the elbow to the fingertips",
      "Massaging, cleansing and beautifying from the knee to the toes",
    ],
    cannot: ["Anything above the elbow or above the knee", "Hair services", "Facials or skin treatments"],
  },
  {
    licence: "Electrologist",
    hrs: hours("Electrologist"),
    href: "/california-electrologist-license",
    section: "7316(g)",
    can: [
      "Removing hair from, or destroying hair on, the body by “the use of an electric needle only”",
      "Electrolysis and thermolysis, both of which the section includes",
    ],
    cannot: [
      "Lasers or any light-based hair removal — a misdemeanour under BPC 7320.5",
      "Waxing, sugaring, depilatories",
      "Any hair, skin or nail service",
    ],
  },
];

const NOT_LICENSED = [
  {
    what: "Natural hair braiding",
    detail:
      "Twisting, wrapping, weaving, extending, locking or braiding by hand or device — provided it involves no haircutting and no dyes, reactive chemicals or other preparations that alter colour or hair structure. No licence required.",
  },
  {
    what: "Threading",
    detail:
      "Removing hair by twisting thread around it and pulling it from the skin, plus the incidental trimming of eyebrow hair. No licence required.",
  },
  {
    what: "Wigs and hairpieces",
    detail: "The mere sale, fitting or styling of wigs or hairpieces sits outside all three practices.",
  },
];

const FAQS = [
  {
    q: "Can a California cosmetologist shave a client?",
    a: "Shaving is enumerated in the barbering definition at 7316(a) and is not enumerated in the cosmetology definition at 7316(b). The board runs a crossover course between barbering and cosmetology — and between no other pair of licences — which is the clearest indication that neither scope contains the other.",
  },
  {
    q: "Can a California barber do nails?",
    a: "Nail work, and treating the hands and feet, are enumerated in the cosmetology definition and not in the barbering one. A barber who wants that scope takes the cosmetology crossover course rather than a second full 1,000-hour programme.",
  },
  {
    q: "Do you need a license to braid hair in California?",
    a: "Not for natural hair braiding on its own. Section 7316(e)(2) puts it outside the practices of barbering, cosmetology and hairstyling entirely. But 7316(f) is the catch: combine braiding with any regulated service — cutting, colour, chemicals — and that is “natural hairstyling”, which does require a barbering or cosmetology licence.",
  },
  {
    q: "Can any California beauty licensee use a laser?",
    a: "No. Business and Professions Code section 7320.5 is one sentence: any licensee who uses a laser in the treatment of any human being is guilty of a misdemeanor. Note the word licensee — it binds every licence the board issues, including electrologists, whose entire practice is hair removal.",
  },
  {
    q: "What is the difference between a hairstylist and a cosmetologist in California?",
    a: `Chemicals. The hairstylist licence takes ${hours("Hairstylist")} hours against cosmetology's ${hours("Cosmetology").toLocaleString()}, and section 7316(h) permits cutting, styling, blow drying, extending and “nonchemically” straightening — with no colour, no perming and no chemical relaxing anywhere in the definition. There is also no crossover course from hairstyling into cosmetology, so it cannot be topped up later.`,
  },
  {
    q: "Can an esthetician do chemical peels in California?",
    a: "The statutory boundary is stated as a result rather than a product list: skin care means improving the appearance or well-being of the skin by means “that do not result in the ablation or destruction of the live tissue”. Any treatment is judged against that line. This is a summary of the statute, not legal advice — confirm with the board before offering a service you are unsure of.",
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california cosmetology scope of practice",
    "esthetician scope of practice california",
    "barber scope of practice california",
    "nail technician scope of practice",
    "what can a cosmetologist do in california",
    "california hairstylist license scope",
    "do you need a license to braid hair in california",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaScopeOfPracticePage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California scope of practice
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          Six licences, and the line between them is not where most people assume. Shaving belongs
          to barbering and not cosmetology. Nails belong to cosmetology and not barbering.
          Hairstyling excludes every chemical service. All of it is one statute &mdash; Business and
          Professions Code section 7316 &mdash; and this is the six of them side by side.
        </p>

        <ResearchByline verifiedOn={VERIFIED_ON} what="Scope read from the Barbering and Cosmetology Act, compiled" />

        {/* The three boundaries that actually decide things. */}
        <section className="mb-10 rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-indigo-950">
            <Scissors className="h-5 w-5" />
            The three boundaries nobody guesses right
          </h2>
          <ul className="space-y-2.5 text-sm leading-relaxed text-indigo-950/90">
            <li>
              <strong className="font-bold">Shaving is barbering only.</strong> It appears in
              7316(a) and not in 7316(b). Cosmetology does not enumerate it.
            </li>
            <li>
              <strong className="font-bold">Nails are cosmetology, not barbering.</strong> Nail
              work, hand and foot treatment and hair removal are all in the cosmetology definition
              and absent from barbering.
            </li>
            <li>
              <strong className="font-bold">Hairstyling is chemical-free.</strong> 7316(h) says
              &ldquo;nonchemically&rdquo; straightening and lists no colour, no perm, no relaxer.
            </li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-indigo-950/90">
            Neither barbering nor cosmetology contains the other, which is why the board runs a
            crossover course between exactly those two and no other pair.
          </p>
        </section>

        <section className="mb-10 space-y-5">
          {SCOPES.map((s) => (
            <div key={s.licence} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-black text-slate-900">{s.licence}</h2>
                <span className="text-xs font-bold text-slate-400">
                  {s.hrs.toLocaleString()} hrs &middot; BPC {s.section}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    May perform
                  </p>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-slate-600">
                    {s.can.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-rose-700">
                    Outside the licence
                  </p>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-slate-600">
                    {s.cannot.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </div>
              </div>
              <Link
                href={s.href}
                data-ig-click={`ca_scope_to_${s.licence.toLowerCase()}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:underline"
              >
                How to get the {s.licence.toLowerCase()} licence
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </section>

        <section className="mb-10 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-rose-950">
            <AlertTriangle className="h-5 w-5" />
            One rule binds every licence: no lasers
          </h2>
          <p className="text-sm leading-relaxed text-rose-950/90">
            Section 7320.5 runs to a single sentence &mdash; any licensee who uses a laser in the
            treatment of any human being is guilty of a{" "}
            <strong className="font-bold">misdemeanor</strong>. A criminal offence, not a licensing
            matter, and the word is <em>licensee</em>: it applies to all six. That includes
            electrologists, whose practice is hair removal and who are confined by 7316(g) to
            &ldquo;the use of an electric needle only&rdquo; while laser hair removal is advertised
            on every high street under an entirely different body of law.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Ban className="h-5 w-5 text-slate-500" />
            Three things California does not license at all
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            Section 7316(e) puts these outside the practices of barbering, cosmetology and
            hairstyling entirely &mdash; no licence required.
          </p>
          <ul className="space-y-2">
            {NOT_LICENSED.map((n) => (
              <li key={n.what} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-black text-slate-900">{n.what}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{n.detail}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm leading-relaxed text-amber-900/90">
              <strong className="font-bold">The catch, at 7316(f):</strong> braiding combined with
              any regulated service &mdash; cutting, colour, chemicals &mdash; is
              &ldquo;natural hairstyling&rdquo;, and that <em>does</em> require a barbering or
              cosmetology licence. The exemption covers braiding on its own, not a braider who also
              trims.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-black text-slate-900">Common questions</h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-1.5 text-sm font-black text-slate-900">{f.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Every scope above is from{" "}
          <a
            href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7316."
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 hover:underline"
          >
            Business and Professions Code section 7316
          </a>
          , with the laser prohibition from section 7320.5, read {VERIFIED_ON}. Quotation marks mark
          the statute&apos;s own wording, kept verbatim where paraphrasing would move the boundary.
          This is a summary of the law and not legal advice &mdash; confirm on{" "}
          <a href="https://www.barbercosmo.ca.gov" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-600 hover:underline">
            barbercosmo.ca.gov
          </a>{" "}
          before offering a service you are unsure of.
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California barbering and cosmetology scope of practice" },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Scope of practice", item: PAGE },
            ],
          }),
        }}
      />
    </div>
  );
}
