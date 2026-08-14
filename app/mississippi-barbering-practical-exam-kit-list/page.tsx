import { MsKitPage } from "@/components/tools/ms-kit-page";
import { MS_BARBERING_KIT } from "@/lib/mississippi-licensing";
import { SITE_URL } from "@/lib/site";

const PATH = "/mississippi-barbering-practical-exam-kit-list";
const TITLE = "Mississippi Barbering Practical Exam Kit List (2026)";
const DESCRIPTION =
  "Every item the Mississippi Board requires for the barbering practical — two mannequins plus a live male model for the taper, shampoo, shave and facial, and the exact label each item must carry.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['mississippi barber practical exam kit list', 'mississippi barbering exam supplies', 'msbcb barber practical exam', 'mississippi barber exam what to bring', 'ms barbering practical exam'].map(String),
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

export default function Page() {
  return (
    <MsKitPage
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      licence="Barbering"
      skills={MS_BARBERING_KIT.skills}
      topic="barbering"
      intro={<>Mississippi is the only exam on this site that requires a live model: four of the nine graded barbering skills — the taper haircut, shampoo, shave and facial — are performed on a live male model, who must be at least 16 and unaffiliated with any MSBCB-licensed school.</>}
      related={[
        { href: "/mississippi-cosmetology-practical-exam-kit-list", label: "Mississippi cosmetology kit list", why: "Same handbook, a different equipment list." },
        { href: "/mississippi-nail-technology-practical-exam-kit-list", label: "Mississippi nail technology kit list", why: "Same handbook, a different equipment list." },
        { href: "/ohio-barber-practical-exam-kit-list", label: "Ohio barber kit list", why: "A board that publishes no list at all — it makes you derive one." },
      ]}
    />
  );
}
