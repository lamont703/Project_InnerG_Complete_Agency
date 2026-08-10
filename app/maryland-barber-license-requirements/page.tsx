import { MdGuide } from "@/components/maryland/md-guide";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import {
  MD_SOURCES, BARBER_REQUIREMENTS, COSMETOLOGY_REQUIREMENTS,
  BARBER_FEES, COSMETOLOGY_FEES, RENEWAL,
} from "@/lib/maryland-licensing";

const TITLE = "Maryland Barber License Requirements (2026): Hours & Fees";
const DESCRIPTION =
  "Every Maryland barber licence category and what it takes: 1,200 school hours or 2,250 as an apprentice, the master barber route, shop owner permits, and the full fee schedule from the Board of Barbers.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "maryland barber license requirements",
    "maryland barber license",
    "how to become a barber in maryland",
    "maryland barber hours",
    "maryland master barber",
    "maryland barber apprentice",
    "barber license md",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/maryland-barber-license-requirements` },
};

export default function Page() {
  return (
    <>
      <MdGuide
        eyebrow="Maryland · Board of Barbers"
        h1="Maryland Barber License Requirements"
        board="Board of Barbers"
        intro={
          <>
            Maryland licenses barbers through its own board, separate from cosmetology and under a
            different title of the law. A barber licence takes <strong>1,200 hours</strong> of school
            training or <strong>2,250 hours</strong> as a registered apprentice, and the master
            barber licence is a second step on top of that, not an alternative to it.
          </>
        }
        facts={[
          { n: "1,200", l: "school hours for a barber", s: "or 2,250 apprentice hours" },
          { n: "900", l: "hours for barber-stylist limited", s: "or 1,650 as an apprentice" },
          { n: "15 mo", l: "licensed before master barber", s: "plus both exams" },
        ]}
        requirements={BARBER_REQUIREMENTS}
        fees={BARBER_FEES}
        sources={[
          { label: "Board of Barbers — License Requirements", href: MD_SOURCES.barberRequirements },
          { label: "Board of Barbers — Forms and Fees", href: MD_SOURCES.barberFees },
          { label: "Barbers Law and Regulations (Title 4, COMAR 09.16)", href: MD_SOURCES.barberLaw },
        ]}
        related={[
          { href: "/maryland-barber-license-renewal", label: "Barber licence renewal", why: "Two-year cycle, $56, and no continuing education requirement." },
          { href: "/maryland-barber-practical-exam-kit-list", label: "Practical exam kit list", why: "What PSI requires you to bring into the exam room." },
          { href: "/maryland-cosmetology-license-requirements", label: "Cosmetology requirements", why: "The other board — different hours, different fees, and CE on renewal." },
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
            url: `${SITE_URL}/maryland-barber-license-requirements`,
            author: authorSchema(),
            isPartOf: { "@type": "CollectionPage", name: "Maryland Barber & Cosmetology Licensing", url: `${SITE_URL}/maryland` },
          }),
        }}
      />
    </>
  );
}
