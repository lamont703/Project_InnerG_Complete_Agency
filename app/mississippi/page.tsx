import type { Metadata } from "next";
import { Award, ClipboardCheck } from "lucide-react";
import { StateHub } from "@/components/state-hub/state-hub";
import { SITE_URL } from "@/lib/site";
import {
  REGULATORS, breadcrumbNode, graph, ref, stateNode, topics, webPageNode,
} from "@/lib/schema-graph";

const PATH = "/mississippi";
const TITLE = "Mississippi Barber & Cosmetology Licensing";
const DESCRIPTION =
  "Mississippi's Board publishes the most complete kit source of any state on this site — four equipment lists, broken down by graded skill, with the exact label each item must carry.";
const CHECKED = "2026-08-14";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}${PATH}`, type: "website" },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

export default function Page() {
  const jsonLd = graph(
    {
      ...webPageNode({ path: PATH, type: "CollectionPage", name: TITLE, breadcrumb: true }),
      about: [ref(REGULATORS.ms["@id"]), stateNode("MS"), ...topics("barbering", "cosmetology")],
    },
    breadcrumbNode(PATH, [
      { name: "Home", path: "" },
      { name: "Mississippi", path: PATH },
    ]),
    REGULATORS.ms,
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StateHub
        stateName="Mississippi"
        checked={CHECKED}
        intro={<>Mississippi's Board publishes the most complete kit source of any state on this site — four equipment lists, broken down by graded skill, with the exact label each item must carry.</>}
        chips={[
        { icon: <Award className="w-5 h-5 text-indigo-600 shrink-0" />, label: <><strong>Board-run</strong> exam</> },
        { icon: <ClipboardCheck className="w-5 h-5 text-blue-700 shrink-0" />, label: <><strong>4</strong> kit lists</> },
        ]}
        practical={[
        { href: "/mississippi-cosmetology-practical-exam-kit-list", label: "Cosmetology", note: "Six skills, two mannequins" },
        { href: "/mississippi-barbering-practical-exam-kit-list", label: "Barbering", note: "Nine skills — four on a live model" },
        { href: "/mississippi-nail-technology-practical-exam-kit-list", label: "Nail technology", note: "Seven skills on a hand form" },
        { href: "/mississippi-esthetics-practical-exam-kit-list", label: "Esthetics", note: "Seven skills, incl. full makeup" },
        ]}
        practicalNote={<>All four come from one document, the MSBCB Practical Exam Handbook. Nothing here is derived: every line is printed in the handbook, listed under the skill it belongs to.</>}
        resources={[
        { href: "https://www.msbcb.ms.gov/wp-content/uploads/2025/04/REVISED-Practical-Exam-Handbook-.pdf", label: "MSBCB Practical Exam Handbook (PDF)", note: "The source for all four lists" },
        { href: "https://www.msbcb.ms.gov/", label: "Mississippi State Board of Cosmetology" },
        ]}
        resourcesNote={
          <>
            Mississippi's practical is board-administered and evaluated by licensed practitioners of the licence being examined — no PSI or NIC bulletin is involved. Straight to the{" "}
            <a href="https://www.msbcb.ms.gov/" className="font-semibold text-blue-700 hover:underline">
              Mississippi State Board of Cosmetology
            </a>
            .
          </>
        }
        siblings={[
        { href: "/texas", label: "Texas hub" },
        { href: "/california", label: "California hub" },
        { href: "/maryland", label: "Maryland hub" },
        { href: "/virginia", label: "Virginia hub" },
        { href: "/ohio", label: "Ohio hub" },
        { href: "/tennessee", label: "Tennessee hub" },
        { href: "/minnesota", label: "Minnesota hub" },
        ]}
      />
    </>
  );
}
