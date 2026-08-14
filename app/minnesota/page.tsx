import type { Metadata } from "next";
import { Award, ClipboardCheck } from "lucide-react";
import { StateHub } from "@/components/state-hub/state-hub";
import { SITE_URL } from "@/lib/site";
import {
  REGULATORS, breadcrumbNode, graph, ref, stateNode, topics, webPageNode,
} from "@/lib/schema-graph";

const PATH = "/minnesota";
const TITLE = "Minnesota Barber & Cosmetology Licensing";
const DESCRIPTION =
  "Minnesota's instructor practical is a taught lesson rather than a service — you present for 20 to 60 minutes and are graded on teaching as well as technique.";
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
      about: [ref(REGULATORS.mn["@id"]), stateNode("MN"), ...topics("cosmetology")],
    },
    breadcrumbNode(PATH, [
      { name: "Home", path: "" },
      { name: "Minnesota", path: PATH },
    ]),
    REGULATORS.mn,
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StateHub
        stateName="Minnesota"
        checked={CHECKED}
        intro={<>Minnesota's instructor practical is a taught lesson rather than a service — you present for 20 to 60 minutes and are graded on teaching as well as technique.</>}
        chips={[
        { icon: <Award className="w-5 h-5 text-indigo-600 shrink-0" />, label: <><strong>PSI</strong> exam</> },
        { icon: <ClipboardCheck className="w-5 h-5 text-blue-700 shrink-0" />, label: <><strong>1</strong> kit list</> },
        ]}
        practical={[
        { href: "/minnesota-cosmetology-instructor-practical-exam-kit-list", label: "Cosmetology instructor", note: "Lesson plan, handout and your own tools" },
        ]}
        practicalNote={<>This is the only teaching exam covered on this site. The packing list is five entries; the rules are what fail people, starting with a 20-minute floor that is an outright fail rather than a deduction.</>}
        resources={[
        { href: "https://mn.gov/boards/cosmetology/", label: "Minnesota Board of Cosmetologist Examiners" },
        { href: "https://test-takers.psiexams.com/MNCOS", label: "PSI candidate portal — MNCOS" },
        ]}
        resourcesNote={
          <>
            Minnesota has a standalone board rather than a division of a commerce department, and the exam is PSI's under client code MNCOS. Straight to the{" "}
            <a href="https://mn.gov/boards/cosmetology/" className="font-semibold text-blue-700 hover:underline">
              Board of Cosmetologist Examiners
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
        { href: "/mississippi", label: "Mississippi hub" },
        { href: "/tennessee", label: "Tennessee hub" },
        ]}
      />
    </>
  );
}
