import { MdGuide } from "@/components/maryland/md-guide";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import {
  REGULATORS, articleGraph, ref, stateNode, topics,
} from "@/lib/schema-graph";
import {
  MD_SOURCES, BARBER_REQUIREMENTS, COSMETOLOGY_REQUIREMENTS,
  BARBER_FEES, COSMETOLOGY_FEES, RENEWAL, CHECKED} from "@/lib/maryland-licensing";
import { questionsForSlug } from "@/lib/agent-invite-questions";

const TITLE = "Maryland Cosmetology License Requirements (2026): Hours & Fees";
const DESCRIPTION =
  "Every Maryland cosmetology licence and its hours: 1,500 for a cosmetologist, 1,200 hairstylist, 600 esthetician, 350 blow dry stylist, 250 nail technician — plus the senior cosmetologist route and the full fee schedule.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "maryland cosmetology license requirements",
    "maryland cosmetology license",
    "cosmetology license md",
    "maryland esthetician license",
    "maryland nail technician license",
    "maryland blow dry stylist license",
    "maryland senior cosmetologist",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/maryland-cosmetology-license-requirements` },
};

export default function Page() {
  return (
    <>
      <MdGuide
      agentQuestions={questionsForSlug("maryland-cosmetology-license-requirements") ?? undefined}
        eyebrow="Maryland · Board of Cosmetologists"
        h1="Maryland Cosmetology License Requirements"
        board="Board of Cosmetologists"
        intro={
          <>
            Maryland splits cosmetology into six practising licences, and the hours between them
            range from <strong>1,500</strong> for a full cosmetologist to <strong>250</strong> for a
            nail technician. It also licenses a <strong>Limited Blow Dry Stylist</strong> at 350
            hours — a category most states do not have at all, and the only one here with no
            apprenticeship route.
          </>
        }
        facts={[
          { n: "1,500", l: "hours for a cosmetologist", s: "or 24 months apprenticing" },
          { n: "250", l: "hours for a nail technician", s: "the shortest route" },
          { n: "17", l: "minimum age, plus 9th grade or GED", s: "applies to every category" },
        ]}
        requirements={COSMETOLOGY_REQUIREMENTS}
        fees={COSMETOLOGY_FEES}
        sources={[
          { label: "Board of Cosmetologists — License Requirements", href: MD_SOURCES.cosRequirements },
          { label: "Board of Cosmetologists — Forms and Fees", href: MD_SOURCES.cosFees },
          { label: "Cosmetologists Law and Regulations (Title 5, COMAR 09.16)", href: MD_SOURCES.cosLaw },
        ]}
        related={[
          { href: "/maryland-cosmetology-license-renewal", label: "Cosmetology licence renewal", why: "Two-year cycle, $28, and 6 CE hours since June 2024." },
          { href: "/maryland-barber-license-requirements", label: "Barber requirements", why: "The other board — 1,200 hours and no CE on renewal." },
          { href: "/maryland-barber-practical-exam-kit-list", label: "Practical exam kit list", why: "What PSI requires in the practical exam room." },
          { href: "/maryland", label: "Maryland hub", why: "Every Maryland licensing guide in one place." },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            articleGraph({
              path: "/maryland-cosmetology-license-requirements",
              headline: TITLE,
              description: DESCRIPTION,
              parentPath: "/maryland",
              parentName: "Maryland Barber & Cosmetology Licensing",
              author: authorSchema(),
              dateModified: CHECKED,
              about: [ref(REGULATORS.md["@id"]), stateNode("MD"), ...topics("cosmetology")],
              extra: [REGULATORS.md],
            })
          ),
        }}
      />
    </>
  );
}
