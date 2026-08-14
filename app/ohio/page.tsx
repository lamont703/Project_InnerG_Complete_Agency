import type { Metadata } from "next";
import { Award, ClipboardCheck } from "lucide-react";
import { StateHub } from "@/components/state-hub/state-hub";
import { SITE_URL } from "@/lib/site";
import {
  REGULATORS, breadcrumbNode, graph, ref, stateNode, topics, webPageNode,
} from "@/lib/schema-graph";

const PATH = "/ohio";
const TITLE = "Ohio Barber & Cosmetology Licensing";
const DESCRIPTION =
  "Ohio writes and administers its own practical, and publishes no supply list — it tells candidates to build one from the graded tasks. These pages do that work.";
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
      about: [ref(REGULATORS.oh["@id"]), stateNode("OH"), ...topics("barbering", "cosmetology")],
    },
    breadcrumbNode(PATH, [
      { name: "Home", path: "" },
      { name: "Ohio", path: PATH },
    ]),
    REGULATORS.oh,
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StateHub
        stateName="Ohio"
        checked={CHECKED}
        intro={<>Ohio writes and administers its own practical, and publishes no supply list — it tells candidates to build one from the graded tasks. These pages do that work.</>}
        chips={[
        { icon: <Award className="w-5 h-5 text-indigo-600 shrink-0" />, label: <><strong>Board-run</strong> exam</> },
        { icon: <ClipboardCheck className="w-5 h-5 text-blue-700 shrink-0" />, label: <><strong>2</strong> kit lists</> },
        ]}
        practical={[
        { href: "/ohio-barber-practical-exam-kit-list", label: "Barber", note: "Eight graded sections, 40 items" },
        { href: "/ohio-cosmetology-practical-exam-kit-list", label: "Cosmetology", note: "Hair, skin and nails — 52 items" },
        ]}
        practicalNote={<>The Ohio State Cosmetology and Barber Board issues a Testing Information Packet rather than a vendor bulletin. It names a handful of items outright and derives the rest from the scored task lines, which each page records section by section.</>}
        resources={[
        { href: "https://codes.ohio.gov/ohio-administrative-code/chapter-4713-5", label: "OAC Chapter 4713-5 — examinations" },
        { href: "https://codes.ohio.gov/ohio-administrative-code/rule-4713-5-28", label: "OAC 4713-5-28 — exam dress code" },
        { href: "https://elicense.ohio.gov/", label: "Ohio eLicense" },
        ]}
        resourcesNote={
          <>
            Ohio's exam rules sit in the Ohio Administrative Code. The Board's own vanity domains do not currently resolve, so these point at the{" "}
            <a href="https://codes.ohio.gov/ohio-administrative-code/chapter-4713-5" className="font-semibold text-blue-700 hover:underline">
              code chapter that governs the exam
            </a>{" "}
            — which does.
          </>
        }
        siblings={[
        { href: "/texas", label: "Texas hub" },
        { href: "/california", label: "California hub" },
        { href: "/maryland", label: "Maryland hub" },
        { href: "/virginia", label: "Virginia hub" },
        { href: "/mississippi", label: "Mississippi hub" },
        { href: "/tennessee", label: "Tennessee hub" },
        { href: "/minnesota", label: "Minnesota hub" },
        ]}
      />
    </>
  );
}
