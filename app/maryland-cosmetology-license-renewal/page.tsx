import { MdGuide } from "@/components/maryland/md-guide";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import { MD_SOURCES, BARBER_FEES, COSMETOLOGY_FEES, RENEWAL } from "@/lib/maryland-licensing";

const TITLE = "Maryland Cosmetology License Renewal (2026): CE Hours, Fee & Steps";
const DESCRIPTION =
  "Renew a Maryland cosmetology licence: the $28 fee, two-year cycle, $28 reinstatement, and the six hours of approved continuing education the State Legislature has required since 1 June 2024.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "maryland cosmetology license renewal",
    "cosmetology license renewal md",
    "renew cosmetology license maryland",
    "maryland cosmetology ce hours",
    "maryland cosmetology continuing education",
    "maryland cosmetology license renewal fee",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/maryland-cosmetology-license-renewal` },
};

export default function Page() {
  return (
    <>
      <MdGuide
        eyebrow="Maryland · Board of Cosmetologists"
        h1="Maryland Cosmetology License Renewal"
        board="Board of Cosmetologists"
        intro={
          <>
            A Maryland cosmetology licence renews on a <strong>two-year cycle</strong> for{" "}
            <strong>{RENEWAL.cosmetology.fee}</strong>, and since <strong>1 June 2024</strong> it
            also requires <strong>six hours of approved continuing education</strong>. That CE
            requirement is set by the State Legislature and applies to this board only — Maryland
            barbers have no CE requirement at all.
          </>
        }
        facts={[
          { n: RENEWAL.cosmetology.fee, l: "renewal fee", s: "two-year licence" },
          { n: "6 hours", l: "continuing education", s: "approved providers since 1 June 2024" },
          { n: RENEWAL.cosmetology.reinstatement, l: "reinstatement if expired", s: "assessed automatically" },
        ]}
        fees={COSMETOLOGY_FEES}
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
          { label: "Board of Cosmetologists — Renew a License", href: MD_SOURCES.cosRenewal },
          { label: "Board of Cosmetologists — Forms and Fees", href: MD_SOURCES.cosFees },
        ]}
        related={[
          { href: "/maryland-cosmetology-license-requirements", label: "Cosmetology requirements", why: "1,500 hours down to 250, and the blow dry stylist licence." },
          { href: "/maryland-barber-license-renewal", label: "Barber renewal", why: "The other board: $56, and no CE requirement." },
          { href: "/maryland-barber-practical-exam-kit-list", label: "Practical exam kit list", why: "What PSI requires in the practical exam room." },
          { href: "/maryland", label: "Maryland hub", why: "Every Maryland licensing guide in one place." },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: TITLE,
            description: DESCRIPTION,
            url: `${SITE_URL}/maryland-cosmetology-license-renewal`,
            author: authorSchema(),
            isPartOf: { "@type": "CollectionPage", name: "Maryland Barber & Cosmetology Licensing", url: `${SITE_URL}/maryland` },
          }),
        }}
      />
    </>
  );
}
