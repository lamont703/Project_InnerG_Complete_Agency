import { MdPractical } from "@/components/maryland/md-practical";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import { PSI_PRACTICALS } from "@/lib/maryland-licensing";

const P = PSI_PRACTICALS.find((x) => x.slug === "maryland-eyelash-extension-practical-exam")!;

const TITLE = "Maryland Eyelash Extension Practical Exam (2026): Topics & Timing";
const DESCRIPTION =
  "The PSI National Eyelash Extension Technician practical in Maryland: four graded topics including a blood exposure incident, 60 minutes, and a 75% pass mark.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "maryland eyelash extension license",
    "maryland eyelash extension exam",
    "eyelash extension technician maryland",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/maryland-eyelash-extension-practical-exam` },
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
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: TITLE,
            description: DESCRIPTION,
            url: `${SITE_URL}/maryland-eyelash-extension-practical-exam`,
            author: authorSchema(),
            isPartOf: { "@type": "CollectionPage", name: "Maryland Barber & Cosmetology Licensing", url: `${SITE_URL}/maryland` },
          }),
        }}
      />
    </>
  );
}
