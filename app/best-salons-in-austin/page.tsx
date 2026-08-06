import { BestOfDirectory, type BestOfEntry } from "@/components/best-of/BestOfDirectory";
import { SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Best-Rated Salons in Austin (2026) — Top Rated, Real Reviews",
  description:
    "The 10 highest-rated hair salons in Austin, ranked by real Google rating and review count — led by Red Stella Salon and Method Hair, both 5.0★ at 500 reviews. 33 real salons clear our 4.5+ rating threshold.",
  keywords: [
    "best salons in Austin",
    "best hair salon Austin",
    "top rated salon Austin TX",
    "highest rated hair salon Austin 2026",
  ],
  openGraph: {
    title: "Best-Rated Salons in Austin (2026)",
    description: "The real, highest-rated hair salons in Austin — ranked by live Google rating and review count.",
    url: `${SITE_URL}/best-salons-in-austin`,
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Best-Rated Salons in Austin (2026)",
    description: "Real, highest-rated salons in Austin — ranked by live rating and review count.",
  },
  alternates: { canonical: `${SITE_URL}/best-salons-in-austin` },
};

const topRated: BestOfEntry[] = [
  { name: "Red Stella Salon", address: "5117 N Lamar Blvd, Austin, TX 78751", rating: 5.0, reviews: 500, slug: "red-stella-salon-austin-a522c06e" },
  { name: "Method Hair", address: "1800 E 4th St #103, Austin, TX 78702", rating: 5.0, reviews: 500, slug: "method-hair-austin-1fedac3f" },
  { name: "The Hair Magician", address: "412 Hackberry Ln #2, Austin, TX 78753", rating: 4.9, reviews: 770, slug: "the-hair-magician-austin-fe4a8ea1" },
  { name: "Harlow Beauty and Hair Salon", address: "6009 Burnet Rd, Austin, TX 78757", rating: 4.9, reviews: 693, slug: "harlow-beauty-and-hair-salon-austin-46039046" },
  { name: "Garbo A Salon and Spa Northcross", address: "7739 Northcross Dr K, Austin, TX 78757", rating: 4.9, reviews: 594, slug: "garbo-a-salon-and-spa-northcross-austin-855d5435" },
  { name: "Ritual Salon", address: "4800 Burnet Rd #430, Austin, TX 78756", rating: 4.9, reviews: 532, slug: "ritual-salon-austin-7c3fdf96" },
  { name: "Plume Salon", address: "5212 Avenue F, Austin, TX 78751", rating: 4.9, reviews: 532, slug: "plume-salon-austin-4f9c31ae" },
  { name: "Deseo Salon", address: "830 W 3rd St #1142, Austin, TX 78701", rating: 4.9, reviews: 479, slug: "deseo-salon-austin-d3ded62b" },
  { name: "Smooshine", address: "3016 Guadalupe St B-100, Austin, TX 78705", rating: 5.0, reviews: 33, slug: "smooshine-austin-fcb63014" },
  { name: "Dolce Salon", address: "3201 Bee Caves Rd #138, Austin, TX 78746", rating: 5.0, reviews: 15, slug: "dolce-salon-austin-8af18570" },
];

const mostReviewed: BestOfEntry[] = [
  { name: "The Hair Magician", address: "412 Hackberry Ln #2, Austin, TX 78753", rating: 4.9, reviews: 770, slug: "the-hair-magician-austin-fe4a8ea1" },
  { name: "Harlow Beauty and Hair Salon", address: "6009 Burnet Rd, Austin, TX 78757", rating: 4.9, reviews: 693, slug: "harlow-beauty-and-hair-salon-austin-46039046" },
  { name: "Salon Vela", address: "3202 W Anderson Ln Unit 206, Austin, TX 78757", rating: 4.7, reviews: 643, slug: "salon-vela-austin-47aa1baa" },
  { name: "Damron & Company Salon", address: "9801 Anderson Mill Rd #125, Austin, TX 78750", rating: 4.8, reviews: 606, slug: "damron-company-salon-austin-0f36641d" },
  { name: "Ziba Hair Salon", address: "13776 US-183 #150, Austin, TX 78750", rating: 4.8, reviews: 606, slug: "ziba-hair-salon-austin-b06916af" },
  { name: "Garbo A Salon and Spa Northcross", address: "7739 Northcross Dr K, Austin, TX 78757", rating: 4.9, reviews: 594, slug: "garbo-a-salon-and-spa-northcross-austin-855d5435" },
];

export default function BestSalonsAustin() {
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
              { "@type": "ListItem", position: 2, name: "Austin", item: `${SITE_URL}/texas/austin` },
              { "@type": "ListItem", position: 3, name: "Best-Rated Salons in Austin", item: `${SITE_URL}/best-salons-in-austin` },
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
            name: "Best-Rated Salons in Austin",
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
        city="Austin"
        category="Salons"
        profileBasePath="/salons"
        searchTab="Salons"
        totalQualifying={33}
        minRating={4.5}
        minReviews={5}
        updatedLabel="July 2026"
        intro="33 real Austin salons clear a 4.5★ rating with at least 5 reviews, out of 39 we could confidently match to the city — the smallest qualifying pool of any city on this list. Red Stella Salon and Method Hair share the top spot at a perfect 5.0★, each with exactly 500 reviews."
        neighborhoodNote="North Austin's Burnet Rd corridor is the real standout: Harlow Beauty and Hair Salon, Ritual Salon, and the most-reviewed Ziba Hair Salon all sit along or just off Burnet Rd between Allandale and Crestview — a distinct corridor from the East Austin/South Congress cluster that dominates Austin's barbershop list."
        topRated={topRated}
        mostReviewed={mostReviewed}
        faqs={[
          {
            question: "What is the best salon in Austin?",
            answer: "Red Stella Salon and Method Hair are tied at the top — both hold a perfect 5.0★ rating with exactly 500 real Google reviews each.",
          },
          {
            question: "How many salons in Austin are highly rated?",
            answer: "33 real, currently-listed Austin salons carry a rating of 4.5★ or higher with at least 5 reviews — out of 39 salons in our database matched to the city.",
          },
          {
            question: "What's the difference between \"Top Rated\" and \"Most Reviewed\" on this page?",
            answer: "Top Rated ranks by rating first, using review count only as a tiebreaker — it surfaces excellent salons regardless of size. Most Reviewed ranks by raw review volume among salons rated 4.0★ or higher, led here by The Hair Magician's 770 reviews.",
          },
          {
            question: "Where are Austin's best salons located?",
            answer: "The data shows a real concentration along Burnet Rd in North Austin (Allandale/Crestview), a different corridor than the East Austin cluster that dominates Austin's barbershop list.",
          },
        ]}
      />
    </>
  );
}
