import type { Metadata } from "next";
import { Award, ClipboardCheck } from "lucide-react";
import { StateHub } from "@/components/state-hub/state-hub";
import { SITE_URL } from "@/lib/site";
import {
  REGULATORS, breadcrumbNode, graph, ref, stateNode, topics, webPageNode,
} from "@/lib/schema-graph";

const PATH = "/virginia";
const TITLE = "Virginia Barber & Cosmetology Licensing";
const DESCRIPTION =
  "Virginia doesn't write its own practical — candidates sit NIC's national examination, and the kit comes from NIC's bulletin rather than from DPOR.";
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
      about: [ref(REGULATORS.va["@id"]), stateNode("VA"), ...topics("barbering", "cosmetology")],
    },
    breadcrumbNode(PATH, [
      { name: "Home", path: "" },
      { name: "Virginia", path: PATH },
    ]),
    REGULATORS.va,
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StateHub
        stateName="Virginia"
        checked={CHECKED}
        intro={<>Virginia doesn't write its own practical — candidates sit NIC's national examination, and the kit comes from NIC's bulletin rather than from DPOR.</>}
        chips={[
        { icon: <Award className="w-5 h-5 text-indigo-600 shrink-0" />, label: <><strong>NIC</strong> national exam</> },
        { icon: <ClipboardCheck className="w-5 h-5 text-blue-700 shrink-0" />, label: <><strong>2</strong> kit lists</> },
        ]}
        practical={[
        { href: "/virginia-master-barber-practical-exam-kit-list", label: "Master barber", note: "51 supplies, nine service groups" },
        { href: "/virginia-cosmetology-practical-exam-kit-list", label: "Cosmetology", note: "32 supplies, one flat list" },
        ]}
        practicalNote={<>Both exams are the National-Interstate Council's, and the two bulletins are four years apart: the barber document is effective 2018, the cosmetology one 2022. They are not interchangeable.</>}
        resources={[
        { href: "https://www.dpor.virginia.gov/boards/barbercosmo", label: "Virginia DPOR — Barbers & Cosmetology" },
        { href: "https://www.nictesting.org/", label: "NIC — the exam vendor" },
        ]}
        resourcesNote={
          <>
            Barbering and cosmetology in Virginia are licensed by the{" "}
            <a href="https://www.dpor.virginia.gov/boards/barbercosmo" className="font-semibold text-blue-700 hover:underline">
              Board for Barbers and Cosmetology
            </a>{" "}
            under DPOR, but the examination itself is NIC's.
          </>
        }
        siblings={[
        { href: "/texas", label: "Texas hub" },
        { href: "/california", label: "California hub" },
        { href: "/maryland", label: "Maryland hub" },
        { href: "/ohio", label: "Ohio hub" },
        { href: "/mississippi", label: "Mississippi hub" },
        { href: "/tennessee", label: "Tennessee hub" },
        { href: "/minnesota", label: "Minnesota hub" },
        ]}
      />
    </>
  );
}
