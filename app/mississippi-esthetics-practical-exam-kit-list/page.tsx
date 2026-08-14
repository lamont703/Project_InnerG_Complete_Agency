import { MsKitPage } from "@/components/tools/ms-kit-page";
import { MS_ESTHETICS_KIT } from "@/lib/mississippi-licensing";
import { SITE_URL } from "@/lib/site";

const PATH = "/mississippi-esthetics-practical-exam-kit-list";
const TITLE = "Mississippi Esthetics Practical Exam Kit List (2026)";
const DESCRIPTION =
  "Every item the Mississippi Board requires for the esthetics practical — the live model and bed sheets, masque and manipulations, waxing, and a full makeup application, with the exact label each product must carry.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['mississippi esthetician practical exam kit list', 'mississippi esthetics exam supplies', 'msbcb esthetics practical exam', 'mississippi esthetician exam what to bring', 'ms esthetics practical exam'].map(String),
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

export default function Page() {
  return (
    <MsKitPage
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      licence="Esthetics"
      skills={MS_ESTHETICS_KIT.skills}
      topic="esthetics"
      intro={<>Mississippi's esthetics practical runs on a live model and includes something no other state on this site grades: a complete makeup application, from concealer through lip colour.</>}
      related={[
        { href: "/mississippi-cosmetology-practical-exam-kit-list", label: "Mississippi cosmetology kit list", why: "Same handbook, a different equipment list." },
        { href: "/mississippi-barbering-practical-exam-kit-list", label: "Mississippi barbering kit list", why: "Same handbook, a different equipment list." },
        { href: "/ohio-cosmetology-practical-exam-kit-list", label: "Ohio cosmetology kit list", why: "A board that publishes no list at all — it makes you derive one." },
      ]}
    />
  );
}
