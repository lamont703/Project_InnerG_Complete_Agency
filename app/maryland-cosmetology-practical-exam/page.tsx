import { MdPractical } from "@/components/maryland/md-practical";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import {
  REGULATORS, articleGraph, ref, stateNode, topics,
} from "@/lib/schema-graph";
import { PSI_PRACTICALS, CHECKED} from "@/lib/maryland-licensing";

const P = PSI_PRACTICALS.find((x) => x.slug === "maryland-cosmetology-practical-exam")!;

const TITLE = "Maryland Cosmetology Practical Exam (2026): 11 Topics, Timing & Pass Mark";
const DESCRIPTION =
  "The PSI National Cosmetology practical in Maryland: all 11 graded topic areas in order with their timings, the 235-minute run, the 75% pass mark, and the container rules — plus why PSI publishes no supply list.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "maryland cosmetology practical exam",
    "psi national cosmetology practical",
    "maryland cosmetology exam topics",
    "maryland cosmetology practical exam kit",
    "cosmetology practical exam maryland",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/maryland-cosmetology-practical-exam` },
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
              path: "/maryland-cosmetology-practical-exam",
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
