import Link from "next/link";
import {
  AlertTriangle,
  ExternalLink,
  Monitor,
  Users,
  ClipboardCheck,
  ArrowRight,
  School,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import {
  COURSES,
  SCHOOL_RESPONSIBILITIES,
  SOURCES,
  CAP_RULE,
  LMS_DEFINITION,
  VERIFIED_ON,
  split,
} from "@/lib/texas-distance-education";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

/**
 * The state-level answer to "can I do barber or cosmetology school online in
 * Texas".
 *
 * WHY THIS PAGE, AND WHY THIS SLUG. Keyword Planner says "hybrid barber school"
 * and "hybrid cosmetology school" have no measurable US volume at all — seeding
 * the planner with nothing but hybrid terms returns zero related keywords with
 * volume. "online barber school" is likewise empty as an exact phrase. What
 * people actually type is "online cosmetology school" (4,400/mo US, 480 TX) and
 * "online barber classes" (1,300/mo US, 170 TX). So the URL and title carry the
 * words with demand, and "hybrid" lives in the body where it costs nothing and
 * catches the trade's own vocabulary as it grows.
 *
 * The page leads with the constraint rather than burying it, because the
 * constraint IS the search intent: someone asking whether they can train online
 * is asking a yes/no question that every school marketing page answers
 * evasively. Answering it in the first sentence is also what makes the page
 * quotable by an assistant, which is the other half of the distribution.
 */

const TITLE = "Online & Hybrid Barber and Cosmetology School in Texas (2026)";
const DESCRIPTION =
  "You cannot finish a Texas barber or cosmetology programme online. TDLR caps distance education at 50% of course hours, theory only — here is the limit for every licence.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "online cosmetology school texas",
    "online barber school texas",
    "online barber classes texas",
    "hybrid barber school texas",
    "hybrid cosmetology school",
    "can you do cosmetology school online",
    "texas distance education cosmetology",
    "tdlr distance education",
    "online cosmetology classes texas",
    "barber school online texas",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: {
    canonical: `${SITE_URL}/texas-online-barber-cosmetology-school-guide`,
  },
};

const FAQS = [
  {
    q: "Can you do barber school online in Texas?",
    a: "Not entirely. Texas allows distance education for the theory portion of a barber programme only, and caps it at 50% of the course's total hours. For the 1,000-hour Class A Barber course that means at most 500 hours online and at least 500 hours physically at a licensed school. TDLR states plainly that courses taught by distance education do not satisfy the requirements of the practical portion of the curriculum.",
  },
  {
    q: "Is there a fully online cosmetology school in Texas?",
    a: "No. No Texas school can lawfully deliver a complete cosmetology programme online, because the practical half cannot be taught at a distance. A Cosmetology Operator course is 1,000 hours, of which a maximum of 500 may be theory delivered by distance education. Any school advertising a fully online Texas cosmetology licence is describing something TDLR rules do not permit.",
  },
  {
    q: "What is a hybrid barber or cosmetology school?",
    a: "\"Hybrid\" is the trade's word for a programme that delivers the theory hours through a learning management system and the practical hours on a physical clinic floor. TDLR does not use the term — its rules call the remote half distance education. In practice a hybrid programme in Texas is any programme using the distance education allowance, which is capped at half the course.",
  },
  {
    q: "How many hours of a Texas cosmetology programme can be completed online?",
    a: "Up to 500 of the 1,000 hours for Cosmetology Operator, and the same for Class A Barber. The specialty courses scale the same way: 375 of 750 for esthetician, 300 of 600 for manicurist, 160 of 320 for eyelash extension, and 150 of 300 for hair weaving. The cap is 50% of total course hours in every case, under 16 TAC §83.202(e)(1).",
  },
  {
    q: "Do online hours count toward my TDLR licence hours?",
    a: "Yes, when the school's course is approved for distance education and the hours are theory. Distance education hours are the only hours in a Texas barbering or cosmetology programme that can be completed without an instructor physically present. The school must track them using the same verification method it uses for in-person attendance and report them electronically to the department.",
  },
  {
    q: "Can the practical exam preparation be done at a distance?",
    a: "No. Practical curriculum cannot be delivered by distance education under any circumstances, and it is the practical portion that the state practical examination tests. This is the single hardest constraint in the rule and it is why no Texas programme can be finished from home.",
  },
  {
    q: "How do I check whether a school's online programme is actually approved?",
    a: "A school's distance education offering is approved course by course, and the school names the specific learning management system on its course-approval application to TDLR. On inspection, inspectors verify the Certificate of Approval, confirm the approved hour limits and require documentation showing hours completed per student. Ask a school directly which of its courses hold distance education approval and how many theory hours are approved — a school running a compliant programme will have a specific number.",
  },
];

export default function TexasOnlineSchoolGuidePage() {
  const barber = COURSES.find((c) => c.key === "barber")!;

  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          Texas &middot; Distance education
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          Online &amp; Hybrid Barber and Cosmetology School in Texas
        </h1>

        <ResearchByline verifiedOn={VERIFIED_ON} what="Researched and verified" />

        {/* The answer, first, in one sentence — for readers and for assistants. */}
        <p className="mb-8 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          <strong className="text-slate-900">
            You cannot complete a Texas barber or cosmetology programme online.
          </strong>{" "}
          Texas permits distance education for the <em>theory</em> half of a course and forbids it
          for the practical half, and it caps the remote portion at 50% of total course hours. That
          makes every legitimate &ldquo;online&rdquo; or &ldquo;hybrid&rdquo; programme in Texas a
          half-and-half arrangement by law, not by choice.
        </p>

        <div className="mb-12 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-amber-900">
            <AlertTriangle className="h-4.5 w-4.5" />
            The rule, in TDLR&apos;s own words
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-amber-900/90">
            &ldquo;Schools may not designate more than 50% of the total hours of a course as theory
            hours delivered via distance education.&rdquo; &mdash; {CAP_RULE}, stated identically on
            every course-approval application TDLR publishes.
          </p>
          <p className="text-sm leading-relaxed text-amber-900/90">
            And separately: &ldquo;Courses taught by distance education do not satisfy the
            requirements of the practical portion of the course curriculum.&rdquo; The two together
            are why a fully remote Texas programme cannot exist &mdash; one caps the remote share,
            the other decides which half it may cover.
          </p>
        </div>

        {/* ---- The table: the reason to link to this page --------------------- */}
        <section className="mb-12">
          <h2 className="mb-1 text-xl font-black text-slate-900">
            Maximum online hours, by licence
          </h2>
          <p className="mb-5 text-sm font-medium text-slate-500">
            Each row was read from that course&apos;s own TDLR approval application &mdash; not
            inferred from the barber form. All eight agree on 50%, but they cite different
            subsections of §83.202 to get there.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[720px] border-collapse bg-white">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                    Course
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                    Total hours
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                    Max online (theory)
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                    Minimum in person
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                    Rule cited on the form
                  </th>
                </tr>
              </thead>
              <tbody>
                {COURSES.map((course) => {
                  const { maxRemote, minInPerson } = split(course);
                  return (
                    <tr key={course.key} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-4">
                        {course.guideHref ? (
                          <Link
                            href={course.guideHref}
                            className="text-sm font-bold text-indigo-600 hover:underline"
                          >
                            {course.label}
                          </Link>
                        ) : (
                          <span className="text-sm font-bold text-slate-900">{course.label}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm font-black tabular-nums text-slate-900">
                        {course.totalHours.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-sm font-black tabular-nums text-emerald-700">
                        {maxRemote.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-sm font-black tabular-nums text-slate-900">
                        {minInPerson.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-xs leading-relaxed text-slate-500">
                        {course.citations.join(", ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            &ldquo;Max online&rdquo; is a ceiling on what a school <em>may</em> offer, not an
            entitlement. A school&apos;s approved figure is whatever it entered on its course
            application, and it can be lower &mdash; or zero, if the school never applied for
            distance education approval at all.
          </p>
        </section>

        {/* ---- What it can and cannot cover ----------------------------------- */}
        <section className="mb-12 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
            <div className="mb-3 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-emerald-700" />
              <h2 className="text-lg font-black text-emerald-900">What can be remote</h2>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-emerald-900/90">
              Theory instruction, delivered through a learning management system, with student and
              instructor separated by physical distance.
            </p>
            <p className="text-sm leading-relaxed text-emerald-900/90">
              Distance education hours are the <strong>only</strong> hours in a Texas programme that
              can be completed without an instructor physically present. That is what makes the
              allowance worth having.
            </p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-700" />
              <h2 className="text-lg font-black text-rose-900">What cannot</h2>
            </div>
            <p className="mb-3 text-sm leading-relaxed text-rose-900/90">
              The entire practical curriculum &mdash; the hours on mannequins and live models that
              the state practical examination actually tests.
            </p>
            <p className="text-sm leading-relaxed text-rose-900/90">
              There is no waiver route published for this and no partial credit. Practical hours are
              earned on a clinic floor or they are not earned.
            </p>
          </div>
        </section>

        {/* ---- School obligations — the operator-facing half ------------------ */}
        <section className="mb-12">
          <h2 className="mb-1 text-xl font-black text-slate-900">
            What a school must be able to prove
          </h2>
          <p className="mb-5 max-w-3xl text-sm font-medium text-slate-500">
            TDLR places five obligations on any school running distance education. They read like a
            software specification because that is effectively what they are &mdash; each one is
            something an inspector can ask a school to evidence on the spot.
          </p>
          <div className="space-y-3">
            {SCHOOL_RESPONSIBILITIES.map((r, i) => (
              <div
                key={r.duty}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900">{r.duty}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{r.why}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- The LMS requirement -------------------------------------------- */}
        <section className="mb-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900">
            <ClipboardCheck className="h-4.5 w-4.5 text-indigo-600" />
            The learning management system is named on the application
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            A school applying to offer distance education does not simply tick a box. The
            course-approval application asks for the total number of theory hours and{" "}
            <strong className="text-slate-900">the name of the learning management system</strong>{" "}
            being used to deliver the curriculum. TDLR defines that system as {LMS_DEFINITION}.
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            The requirement that the LMS track distance hours by the same verification method as
            in-person attendance is the one most improvised setups fail. A paper sign-in sheet for
            the clinic floor and a video-completion log for theory are two different methods of
            verification, and a school running that combination is not meeting the standard however
            diligently it keeps both.
          </p>
        </section>

        {/* ---- Our data ------------------------------------------------------- */}
        <section className="mb-12">
          <h2 className="mb-1 text-xl font-black text-slate-900">
            Finding a Texas school that offers it
          </h2>
          <p className="mb-5 max-w-3xl text-sm font-medium text-slate-500">
            Distance education approval is granted per course, and TDLR does not publish a list of
            which schools hold it &mdash; so it has to be asked for directly. We track{" "}
            <strong className="text-slate-900">994 Texas barber and cosmetology school profiles
            across 241 cities</strong>, which is where to start the shortlist.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                href: "/texas-school-leaderboard",
                label: "Texas School Leaderboard",
                why: "Ranked by 2026 written and practical pass rates — the outcome measure that matters more than delivery format.",
              },
              {
                href: "/compare-schools",
                label: "Compare Schools Side by Side",
                why: "Tuition, completion rate, median earnings and debt, for schools where the public data exists.",
              },
              {
                href: "/directory/barber-schools",
                label: "Every Barber School We Track",
                why: "213 Texas barber school profiles with contact details to ask the approval question directly.",
              },
              {
                href: "/states-that-allow-online-cosmetology-school",
                label: "Which States Allow Online School",
                why: "The verified state-by-state matrix — Alabama matches Texas at 50%, California permits none at all.",
              },
              {
                href: "/naccas-distance-education-requirements",
                label: "NACCAS VI.02 — for school owners",
                why: "The accreditation requirements that stack on top of TDLR's, including the 10-business-day campus rule.",
              },
              {
                href: "/texas",
                label: "Texas Licensing Hub",
                why: "Every licence, exam, kit list and renewal guide we hold for Texas, grouped by the question being asked.",
              },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                    {l.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{l.why}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
              </Link>
            ))}
          </div>
        </section>

        {/* ---- Questions to ask ----------------------------------------------- */}
        <section className="mb-12 rounded-2xl border border-indigo-200 bg-indigo-50/50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-indigo-900">
            <School className="h-4.5 w-4.5" />
            Three questions that separate a real hybrid programme from a marketing claim
          </h2>
          <ol className="space-y-3 text-sm leading-relaxed text-indigo-900/90">
            <li>
              <strong>&ldquo;Which of your courses hold distance education approval, and for how
              many theory hours?&rdquo;</strong> A compliant school answers with a number, because
              it wrote one on its application. Vagueness here is the answer.
            </li>
            <li>
              <strong>&ldquo;Which learning management system do you use?&rdquo;</strong> It is named
              on the approval application, so there is a correct answer on file with the state.
            </li>
            <li>
              <strong>&ldquo;How do you verify my distance hours?&rdquo;</strong> It must be the same
              method used for in-person attendance. If the two sound different, they are.
            </li>
          </ol>
        </section>

        {/* ---- Sources -------------------------------------------------------- */}
        <section className="mb-12">
          <h2 className="mb-4 text-xl font-black text-slate-900">Sources</h2>
          <div className="space-y-2">
            {SOURCES.map((s) => (
              <div key={s.url} className="rounded-xl border border-slate-200 bg-white px-5 py-3">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:underline"
                >
                  {s.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.settles}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-relaxed text-slate-600">
            Read in full on {VERIFIED_ON}. TDLR&apos;s distance-education page states that inspectors
            confirm &ldquo;approved hour limits&rdquo; but does not publish a limit itself &mdash;
            the 50% figure comes from {CAP_RULE} and from the course-approval applications, which is
            why each row in the table above cites the form it came from. Rules change; confirm with
            TDLR before relying on any figure here for an application.
          </p>
        </section>

        {/* ---- FAQ ------------------------------------------------------------ */}
        <div className="border-t border-slate-200 pt-10">
          <h2 className="mb-6 text-xl font-black text-slate-900">Common Questions</h2>
          <div className="space-y-6">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <h3 className="mb-1.5 text-sm font-black text-slate-900">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/texas-online-barber-cosmetology-school-guide#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
          )),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "Article",
            "@id": `${SITE_URL}/texas-online-barber-cosmetology-school-guide#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            about: {
              "@type": "Thing",
              name: "Distance education in Texas barbering and cosmetology programmes",
            },
            citation: SOURCES.map((s) => ({
              "@type": "CreativeWork",
              name: s.label,
              url: s.url,
            })),
            mainEntity: {
              "@type": "Table",
              name: "Maximum distance education hours by Texas licence type",
              about: `Distance education is capped at 50% of total course hours under ${CAP_RULE}. Class A Barber ${
                split(barber).maxRemote
              } of ${barber.totalHours} hours.`,
            },
          },
          )),
        }}
      />
    </div>
  );
}
