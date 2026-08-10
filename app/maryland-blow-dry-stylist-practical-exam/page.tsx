import { MdPractical } from "@/components/maryland/md-practical";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import {
  REGULATORS, articleGraph, ref, stateNode, topics,
} from "@/lib/schema-graph";
import { PSI_PRACTICALS, CHECKED} from "@/lib/maryland-licensing";

const P = PSI_PRACTICALS.find((x) => x.slug === "maryland-blow-dry-stylist-practical-exam")!;

const TITLE = "Maryland Blow Dry Stylist Practical Exam (2026): Topics & Timing";
const DESCRIPTION =
  "Maryland licenses a Limited Blow Dry Stylist at 350 hours — a category most states do not have. The PSI practical is three graded topics, and two inconsistencies in PSI's own bulletin are worth knowing before exam day.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "maryland blow dry stylist license",
    "maryland blow dry stylist exam",
    "blow dry stylist license maryland",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/maryland-blow-dry-stylist-practical-exam` },
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
              path: "/maryland-blow-dry-stylist-practical-exam",
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
