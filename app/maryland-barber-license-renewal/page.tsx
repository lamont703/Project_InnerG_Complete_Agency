import { MdGuide } from "@/components/maryland/md-guide";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import {
  REGULATORS, articleGraph, ref, stateNode, topics,
} from "@/lib/schema-graph";
import { MD_SOURCES, BARBER_FEES, COSMETOLOGY_FEES, RENEWAL, CHECKED} from "@/lib/maryland-licensing";

const TITLE = "Maryland Barber License Renewal (2026): Fee, Cycle & Steps";
const DESCRIPTION =
  "Renew a Maryland barber licence: the $56 fee, the two-year cycle, the $56 reinstatement if you let it lapse — and why barbers, unlike cosmetologists, have no continuing education requirement.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "maryland barber license renewal",
    "renew barber license maryland",
    "maryland barber license renewal fee",
    "barber license renewal md",
    "maryland barber license expired",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/maryland-barber-license-renewal` },
};

export default function Page() {
  return (
    <>
      <MdGuide
        eyebrow="Maryland · Board of Barbers"
        h1="Maryland Barber License Renewal"
        board="Board of Barbers"
        intro={
          <>
            A Maryland barber licence renews on a <strong>two-year cycle</strong> for{" "}
            <strong>{RENEWAL.barber.fee}</strong>. The detail worth knowing before you start: the
            Board of Barbers sets <strong>no continuing education requirement</strong>. That is not
            true of the Board of Cosmetologists, which has required six hours since June 2024 — so
            advice written for one board does not apply to the other.
          </>
        }
        facts={[
          { n: RENEWAL.barber.fee, l: "renewal fee", s: "two-year licence" },
          { n: RENEWAL.barber.reinstatement, l: "reinstatement if expired", s: "assessed automatically" },
          { n: "None", l: "continuing education", s: "cosmetology requires 6 hours" },
        ]}
        fees={BARBER_FEES}
        body={
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-black text-slate-900">How the renewal actually runs</h2>
            <ol className="space-y-3">
              {[
                ["The board writes to you first", `Renewal information and instructions are mailed roughly ${RENEWAL.noticeDaysBefore} days before your licence expires. Not receiving it does not extend the deadline.`],
                ["Renew online", "Renewal is done through the state's online licensing system. You create a password by identifying yourself, then use it with your registration number."],
                ["Shop and salon owners need more", "Employers must have their workers' compensation policy number and the insurance company's name to complete the renewal forms."],
                ["Late means reinstatement, not just a late fee", "Once the licence has expired a reinstatement fee is assessed automatically on top of the renewal."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">{i + 1}</span>
                  <span>
                    <span className="block text-sm font-black text-slate-900">{t}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-slate-600">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        }
        sources={[
          { label: "Board of Barbers — Renew a License", href: MD_SOURCES.barberRenewal },
          { label: "Board of Barbers — Forms and Fees", href: MD_SOURCES.barberFees },
        ]}
        related={[
          { href: "/maryland-barber-license-requirements", label: "Barber licence requirements", why: "1,200 school hours or 2,250 as an apprentice, and every other category." },
          { href: "/maryland-cosmetology-license-renewal", label: "Cosmetology renewal", why: "The other board: $28, and six CE hours are required." },
          { href: "/maryland-barber-practical-exam-kit-list", label: "Practical exam kit list", why: "For anyone still working toward the licence." },
          { href: "/maryland", label: "Maryland hub", why: "Every Maryland licensing guide in one place." },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            articleGraph({
              path: "/maryland-barber-license-renewal",
              headline: TITLE,
              description: DESCRIPTION,
              parentPath: "/maryland",
              parentName: "Maryland Barber & Cosmetology Licensing",
              author: authorSchema(),
              dateModified: CHECKED,
              about: [ref(REGULATORS.md["@id"]), stateNode("MD"), ...topics("barbering")],
              extra: [REGULATORS.md],
            })
          ),
        }}
      />
    </>
  );
}
