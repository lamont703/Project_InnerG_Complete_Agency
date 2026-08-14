import { MsKitPage } from "@/components/tools/ms-kit-page";
import { MS_NAIL_KIT } from "@/lib/mississippi-licensing";
import { SITE_URL } from "@/lib/site";

const PATH = "/mississippi-nail-technology-practical-exam-kit-list";
const TITLE = "Mississippi Nail Technology Practical Exam Kit List (2026)";
const DESCRIPTION =
  "Every item the Mississippi Board requires for the nail technology practical — the pre-polished hand form, acrylic over form, tips and overlays, and the exact label each product must carry.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['mississippi nail technician practical exam kit list', 'mississippi nail technology exam supplies', 'msbcb nail practical exam', 'mississippi manicurist exam what to bring', 'ms nail technologist practical exam'].map(String),
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

export default function Page() {
  return (
    <MsKitPage
      path={PATH}
      title={TITLE}
      description={DESCRIPTION}
      licence="Nail Technology"
      skills={MS_NAIL_KIT.skills}
      topic="nails"
      intro={<>Mississippi grades seven nail skills on a hand form that arrives with nails affixed and polished white, running from polish removal through acrylic over form to a full dark polish application.</>}
      related={[
        { href: "/mississippi-cosmetology-practical-exam-kit-list", label: "Mississippi cosmetology kit list", why: "Same handbook, a different equipment list." },
        { href: "/mississippi-barbering-practical-exam-kit-list", label: "Mississippi barbering kit list", why: "Same handbook, a different equipment list." },
        { href: "/ohio-cosmetology-practical-exam-kit-list", label: "Ohio cosmetology kit list", why: "A board that publishes no list at all — it makes you derive one." },
      ]}
    />
  );
}
