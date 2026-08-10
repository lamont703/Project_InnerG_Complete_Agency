import { MdPractical } from "@/components/maryland/md-practical";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import {
  REGULATORS, articleGraph, ref, stateNode, topics,
} from "@/lib/schema-graph";
import { PSI_PRACTICALS, CHECKED} from "@/lib/maryland-licensing";

const P = PSI_PRACTICALS.find((x) => x.slug === "maryland-nail-technician-practical-exam")!;

const TITLE = "Maryland Nail Technician Practical Exam (2026): Topics, Timing & Pass Mark";
const DESCRIPTION =
  "The PSI National Nail Technician practical in Maryland: five graded topic areas, 90 minutes, a 75% pass mark, the low-odour monomer rule, and why PSI publishes no supply list.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "maryland nail technician practical exam",
    "maryland nail tech license exam",
    "psi nail technician practical maryland",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/maryland-nail-technician-practical-exam` },
};

export default function Page() {
  return (
    <>
      <MdPractical
        p={P}
        related={[
          { href: "/maryland-cosmetology-license-requirements", label: "Cosmetology licence requirements", why: "The hours behind every cosmetology licence, 1,500 down to 250." },
          { href: "/maryland-cosmetology-license-renewal", label: "Cosmetology renewal", why: "Two-year cycle, $28, and 6 CE hours since June 2024." },
          { href: "/maryland-barber-practical-exam-kit-list", label: "Barber kit list", why: "The one Maryland practical that does have an itemised kit." },
          { href: "/maryland", label: "Maryland hub", why: "Every Maryland licensing guide in one place." },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            articleGraph({
              path: "/maryland-nail-technician-practical-exam",
              headline: TITLE,
              description: DESCRIPTION,
              parentPath: "/maryland",
              parentName: "Maryland Barber & Cosmetology Licensing",
              author: authorSchema(),
              dateModified: CHECKED,
              about: [ref(REGULATORS.md["@id"]), stateNode("MD"), ...topics("nails")],
              extra: [REGULATORS.md],
            })
          ),
        }}
      />
    </>
  );
}
