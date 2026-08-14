import { MsKitPage } from "@/components/tools/ms-kit-page";
import { MS_COSMETOLOGY_KIT } from "@/lib/mississippi-licensing";
import { SITE_URL } from "@/lib/site";

const PATH = "/mississippi-cosmetology-practical-exam-kit-list";
const TITLE = "Mississippi Cosmetology Practical Exam Kit List (2026)";
const DESCRIPTION =
  "Every item the Mississippi Board's Practical Exam Handbook requires for the cosmetology practical — two mannequins, six perm rods, the mock chemicals, and the exact label each item must carry.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['mississippi cosmetology practical exam kit list', 'mississippi cosmetology exam supplies', 'msbcb practical exam handbook', 'mississippi cosmetology exam what to bring', 'ms cosmetology practical exam'].map(String),
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

export default function Page() {
  return (
    <MsKitPage
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      licence="Cosmetology"
      skills={MS_COSMETOLOGY_KIT.skills}
      topic="cosmetology"
      intro={<>Mississippi grades six cosmetology skills across two mannequins — a layered haircut, permanent wave, thermal styling, thermal pressing, a highlight and bleach retouch, and a relaxer retouch.</>}
      related={[
        { href: "/mississippi-barbering-practical-exam-kit-list", label: "Mississippi barbering kit list", why: "Same handbook, a different equipment list." },
        { href: "/mississippi-nail-technology-practical-exam-kit-list", label: "Mississippi nail technology kit list", why: "Same handbook, a different equipment list." },
        { href: "/ohio-cosmetology-practical-exam-kit-list", label: "Ohio cosmetology kit list", why: "A board that publishes no list at all — it makes you derive one." },
      ]}
    />
  );
}
