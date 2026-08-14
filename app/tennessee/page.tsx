import type { Metadata } from "next";
import { Award, ClipboardCheck } from "lucide-react";
import { StateHub } from "@/components/state-hub/state-hub";
import { SITE_URL } from "@/lib/site";
import {
  REGULATORS, breadcrumbNode, graph, ref, stateNode, topics, webPageNode,
} from "@/lib/schema-graph";

const PATH = "/tennessee";
const TITLE = "Tennessee Barber & Cosmetology Licensing";
const DESCRIPTION =
  "Only one of Tennessee's three barber bulletins publishes a kit — and it's also the only bulletin on this site that tells you what the test centre supplies.";
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
      about: [ref(REGULATORS.tn["@id"]), stateNode("TN"), ...topics("barbering")],
    },
    breadcrumbNode(PATH, [
      { name: "Home", path: "" },
      { name: "Tennessee", path: PATH },
    ]),
    REGULATORS.tn,
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StateHub
        stateName="Tennessee"
        checked={CHECKED}
        intro={<>Only one of Tennessee's three barber bulletins publishes a kit — and it's also the only bulletin on this site that tells you what the test centre supplies.</>}
        chips={[
        { icon: <Award className="w-5 h-5 text-indigo-600 shrink-0" />, label: <><strong>PSI</strong> exam</> },
        { icon: <ClipboardCheck className="w-5 h-5 text-blue-700 shrink-0" />, label: <><strong>1</strong> kit list</> },
        ]}
        practical={[
        { href: "/tennessee-barber-technician-practical-exam-kit-list", label: "Barber technician", note: "22 supplies, plus what the vendor provides" },
        ]}
        practicalNote={<>Master Barber uses the PSI closable-container format with no itemised supplies, and Barber Instructor asks candidates to bring whatever their own lesson plan needs. Neither can be written without inventing its contents, so neither has a page.</>}
        resources={[
        { href: "https://www.tn.gov/commerce/regboards/cosmo.html", label: "TN Board of Cosmetology & Barber Examiners" },
        { href: "https://www.psiexams.com/", label: "PSI Exams — the exam vendor" },
        ]}
        resourcesNote={
          <>
            Tennessee licenses through the Department of Commerce and Insurance, but the exam is PSI's. Straight to the{" "}
            <a href="https://www.tn.gov/commerce/regboards/cosmo.html" className="font-semibold text-blue-700 hover:underline">
              Board of Cosmetology and Barber Examiners
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
        { href: "/minnesota", label: "Minnesota hub" },
        ]}
      />
    </>
  );
}
