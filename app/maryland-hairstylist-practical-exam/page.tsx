import { MdPractical } from "@/components/maryland/md-practical";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import { PSI_PRACTICALS } from "@/lib/maryland-licensing";

const P = PSI_PRACTICALS.find((x) => x.slug === "maryland-hairstylist-practical-exam")!;

const TITLE = "Maryland Hairstylist Practical Exam (2026): Topics, Timing & Pass Mark";
const DESCRIPTION =
  "The PSI National Hairstylist practical in Maryland: seven graded topic areas with timings, 145 minutes, a 75% pass mark, and the container rules — and why there is no supply list to find.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "maryland hairstylist practical exam",
    "maryland limited hairstylist license exam",
    "psi hairstylist practical maryland",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/maryland-hairstylist-practical-exam` },
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
            url: `${SITE_URL}/maryland-hairstylist-practical-exam`,
            author: authorSchema(),
            isPartOf: { "@type": "CollectionPage", name: "Maryland Barber & Cosmetology Licensing", url: `${SITE_URL}/maryland` },
          }),
        }}
      />
    </>
  );
}
