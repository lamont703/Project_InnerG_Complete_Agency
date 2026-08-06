import { BestOfDirectory, type BestOfEntry } from "@/components/best-of/BestOfDirectory";
import { SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Best-Rated Salons in Dallas (2026) — Top Rated, Real Reviews",
  description:
    "The 10 highest-rated hair salons in Dallas, ranked by real Google rating and review count — led by MERE Salon and Muse the Salon, both 5.0★ at 205 reviews. 54 real salons clear our 4.5+ rating threshold.",
  keywords: [
    "best salons in Dallas",
    "best hair salon Dallas",
    "top rated salon Dallas",
    "highest rated hair salon Dallas 2026",
  ],
  openGraph: {
    title: "Best-Rated Salons in Dallas (2026)",
    description: "The real, highest-rated hair salons in Dallas — ranked by live Google rating and review count.",
    url: `${SITE_URL}/best-salons-in-dallas`,
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Best-Rated Salons in Dallas (2026)",
    description: "Real, highest-rated salons in Dallas — ranked by live rating and review count.",
  },
  alternates: { canonical: `${SITE_URL}/best-salons-in-dallas` },
};

const topRated: BestOfEntry[] = [
  { name: "MERE Salon", address: "6137 Luther Ln, Dallas, TX 75225", rating: 5.0, reviews: 205, slug: "mere-salon-dallas-6ec5e9b4" },
  { name: "Muse the Salon", address: "5330 E Mockingbird Ln Suite 190, Dallas, TX 75206", rating: 5.0, reviews: 205, slug: "muse-the-salon-dallas-294abc4b" },
  { name: "Sofie Hair Salon", address: "2527 Royal Ln #145B, Dallas, TX 75229", rating: 5.0, reviews: 93, slug: "sofie-hair-salon-dallas-896b30e4" },
  { name: "Hair Revival Studio", address: "2242 Monitor St #150, Dallas, TX 75207", rating: 4.9, reviews: 800, slug: "hair-revival-studio-dallas-451e49e1" },
  { name: "Artistik Edge Hair Studio", address: "7077 Watercrest Parkway #100, Dallas, TX 75231", rating: 4.9, reviews: 800, slug: "artistik-edge-hair-studio-dallas-3a45849b" },
  { name: "ERA Salon", address: "4023 Oak Lawn Ave #120, Dallas, TX 75219", rating: 4.9, reviews: 285, slug: "era-salon-dallas-dbd0d602" },
  { name: "La Maison Salon", address: "3716 Bowser Ave, Dallas, TX 75219", rating: 4.9, reviews: 285, slug: "la-maison-salon-dallas-785a2c78" },
  { name: "Bigger Better Hair Salon", address: "3300 Oak Lawn Ave Ste 102, Dallas, TX 75219", rating: 4.9, reviews: 285, slug: "bigger-better-hair-salon-dallas-06d94866" },
  { name: "Select Salon Dallas", address: "3526 Cedar Springs Rd, Dallas, TX 75219", rating: 4.9, reviews: 285, slug: "select-salon-dallas-dallas-8ed2e2ad" },
  { name: "Ritual Space", address: "1005 W Jefferson Blvd Ste 402e, Dallas, TX 75208", rating: 4.9, reviews: 252, slug: "ritual-space-dallas-7d8f025d" },
];

const mostReviewed: BestOfEntry[] = [
  { name: "Blondtourage Salon", address: "13465 Inwood Rd Suite 160, Dallas, TX 75244", rating: 4.8, reviews: 913, slug: "blondtourage-salon-dallas-883a5f5b" },
  { name: "DUO Salon", address: "13450 Inwood Rd #300, Dallas, TX 75240", rating: 4.8, reviews: 913, slug: "duo-salon-dallas-835156e6" },
  { name: "Lure Salon", address: "3839 McKinney Ave #100, Dallas, TX 75204", rating: 4.5, reviews: 835, slug: "lure-salon-dallas-3f30ebd1" },
  { name: "Hair Revival Studio", address: "2242 Monitor St #150, Dallas, TX 75207", rating: 4.9, reviews: 800, slug: "hair-revival-studio-dallas-451e49e1" },
  { name: "Unicorn Hair Queen Extensions", address: "2811 McKinney Ave #22, Dallas, TX 75204", rating: 4.8, reviews: 748, slug: "unicorn-hair-queen-extensions-dallas-232397d0" },
  { name: "House of Dear", address: "2604 Hibernia St, Dallas, TX 75204", rating: 4.8, reviews: 748, slug: "house-of-dear-dallas-a8c50600" },
];

export default function BestSalonsDallas() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Dallas", item: `${SITE_URL}/texas/dallas` },
              { "@type": "ListItem", position: 3, name: "Best-Rated Salons in Dallas", item: `${SITE_URL}/best-salons-in-dallas` },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Best-Rated Salons in Dallas",
            itemListOrder: "https://schema.org/ItemListOrderDescending",
            numberOfItems: topRated.length,
            itemListElement: topRated.map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "LocalBusiness",
                name: s.name,
                address: { "@type": "PostalAddress", streetAddress: s.address, addressRegion: "TX", addressCountry: "US" },
                aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.reviews, bestRating: 5, worstRating: 1 },
                url: `${SITE_URL}/salons/${s.slug}`,
              },
            })),
          }),
        }}
      />
      <BestOfDirectory
        city="Dallas"
        category="Salons"
        profileBasePath="/salons"
        searchTab="Salons"
        totalQualifying={54}
        minRating={4.5}
        minReviews={5}
        updatedLabel="July 2026"
        intro="54 real Dallas salons clear a 4.5★ rating with at least 5 reviews, out of 60 we could confidently match to the city. MERE Salon and Muse the Salon share the top spot at a perfect 5.0★, tied at exactly 205 reviews each."
        neighborhoodNote="The same Uptown corridor that dominates Dallas's barbershop list shows up again here: ERA Salon, La Maison Salon, Bigger Better Hair Salon, and Select Salon Dallas all sit within blocks of each other on or near Oak Lawn Ave and Cedar Springs Rd — making Uptown Dallas the one real dual barbershop-and-salon hub among all four cities in this series."
        topRated={topRated}
        mostReviewed={mostReviewed}
        faqs={[
          {
            question: "What is the best salon in Dallas?",
            answer: "MERE Salon and Muse the Salon are tied at the top — both hold a perfect 5.0★ rating with exactly 205 real Google reviews each.",
          },
          {
            question: "How many salons in Dallas are highly rated?",
            answer: "54 real, currently-listed Dallas salons carry a rating of 4.5★ or higher with at least 5 reviews — out of 60 salons in our database matched to the city.",
          },
          {
            question: "What's the difference between \"Top Rated\" and \"Most Reviewed\" on this page?",
            answer: "Top Rated ranks by rating first, using review count only as a tiebreaker. Most Reviewed ranks by raw review volume among salons rated 4.0★ or higher, led here by a tie between Blondtourage Salon and DUO Salon at 913 reviews each.",
          },
          {
            question: "Where are Dallas's best salons located?",
            answer: "Uptown Dallas — the Oak Lawn Ave and Cedar Springs Rd corridor — is the standout, home to four of the ten highest-rated salons in the city and the same district that also dominates Dallas's barbershop list.",
          },
        ]}
      />
    </>
  );
}
