import { BestOfDirectory, type BestOfEntry } from "@/components/best-of/BestOfDirectory";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

export const metadata = {
  title: "Best-Rated Salons in Houston (2026) — Top Rated, Real Reviews",
  description:
    "The 10 highest-rated hair salons in Houston, ranked by real Google rating and review count — led by Vella Bella Salon Park & Nail Spa at 5.0★ across 1,312 reviews. 1,027 real salons clear our 4.5+ rating threshold.",
  keywords: [
    "best salons in Houston",
    "best hair salon Houston",
    "top rated salon Houston",
    "highest rated hair salon Houston 2026",
    "best nail salon Houston",
  ],
  openGraph: {
    title: "Best-Rated Salons in Houston (2026)",
    description: "The real, highest-rated hair salons in Houston — ranked by live Google rating and review count.",
    url: `${SITE_URL}/best-salons-in-houston`,
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Best-Rated Salons in Houston (2026)",
    description: "Real, highest-rated salons in Houston — ranked by live rating and review count.",
  },
  alternates: { canonical: `${SITE_URL}/best-salons-in-houston` },
};

const topRated: BestOfEntry[] = [
  { name: "Vella Bella Salon Park & Nail Spa", address: "13572 TX-249 Ste D, Houston, TX 77086", rating: 5.0, reviews: 1312, slug: "vella-bella-salon-park-nail-spa-houston-f8ace405" },
  { name: "Dovera Beauty & Head Spa", address: "10804 Bellaire Blvd B, Houston, TX 77072", rating: 5.0, reviews: 1023, slug: "dovera-beauty-head-spa-g-i-u-d-ng-sinh-houston-af72b3de" },
  { name: "La Belle Vie Nail Spa", address: "12180 Antoine Dr, Houston, TX 77066", rating: 5.0, reviews: 712, slug: "la-belle-vie-nail-spa-houston-4fcf24ff" },
  { name: "Frequency Salon", address: "461 Bay Area Blvd, Houston, TX 77058", rating: 5.0, reviews: 640, slug: "frequency-salon-houston-a981ebed" },
  { name: "Crespo Rey Hair Salon", address: "13421 Westheimer Rd Ste B, Houston, TX 77082", rating: 5.0, reviews: 473, slug: "crespo-rey-hair-salon-houston-ed5b7300" },
  { name: "Louis Hair Salon", address: "7419 S Kirkwood Rd Ste B, Houston, TX 77072", rating: 5.0, reviews: 343, slug: "louis-hair-salon-houston-e83962a5" },
  { name: "The Art of Face", address: "396 W Greens Rd #428, Houston, TX 77067", rating: 5.0, reviews: 338, slug: "the-art-of-face-houston-83395fae" },
  { name: "Expert Hair Salon", address: "6100 Westheimer Rd A142 Suite 111, Houston, TX 77057", rating: 5.0, reviews: 305, slug: "expert-hair-salon-houston-78294ecf" },
  { name: "Bel-Hair Salon", address: "9600 Bellaire Blvd #106, Houston, TX 77036", rating: 5.0, reviews: 303, slug: "bel-hair-salon-houston-504b0e36" },
  { name: "Prism Salon", address: "2522 Yale St Ste 100, Houston, TX 77008", rating: 5.0, reviews: 282, slug: "prism-salon-houston-f52629e6" },
];

const mostReviewed: BestOfEntry[] = [
  { name: "Milano Nail Spa Memorial", address: "9355 Katy Fwy, Houston, TX 77024", rating: 4.9, reviews: 3463, slug: "milano-nail-spa-memorial-houston-fae2c967" },
  { name: "Josephine's Day Spa & Salon — Eldridge", address: "1127 Eldridge Pkwy #1008, Houston, TX 77077", rating: 4.8, reviews: 2238, slug: "josephine-s-day-spa-salon-eldridge-houston-fddaddd2" },
  { name: "Clique", address: "2411 Times Blvd Ste 120, Houston, TX 77005", rating: 4.9, reviews: 1889, slug: "clique-houston-a9707564" },
  { name: "Visible Changes (Memorial City)", address: "303 Memorial City Way Ste 810, Houston, TX 77024", rating: 4.4, reviews: 1852, slug: "visible-changes-inside-memorial-city-houston-d9153d95" },
  { name: "Lumiere Nail Studios & Salon Park", address: "22490 TX-249, Houston, TX 77070", rating: 4.9, reviews: 1540, slug: "lumiere-nail-studios-salon-park-houston-7170c04e" },
  { name: "Beautique Day Spa & Salon", address: "5520 Weslayan St, Houston, TX 77005", rating: 4.9, reviews: 1536, slug: "beautique-day-spa-salon-houston-d6cc5cb7" },
];

export default function BestSalonsHouston() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "BreadcrumbList",
            "@id": `${SITE_URL}/best-salons-in-houston#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Houston", item: `${SITE_URL}/texas/houston` },
              { "@type": "ListItem", position: 3, name: "Best-Rated Salons in Houston", item: `${SITE_URL}/best-salons-in-houston` },
            ],
          },
          )),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "ItemList",
            "@id": `${SITE_URL}/best-salons-in-houston#itemlist`,
            name: "Best-Rated Salons in Houston",
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
          },
          )),
        }}
      />
      <BestOfDirectory
        city="Houston"
        category="Salons"
        profileBasePath="/salons"
        searchTab="Salons"
        totalQualifying={1027}
        minRating={4.5}
        minReviews={5}
        updatedLabel="July 2026"
        intro="Houston's salon market dwarfs every other category in this dataset — 1,027 real hair and nail salons clear a 4.5★ rating with at least 5 reviews, out of 1,358 we could confidently match to the city. Vella Bella Salon Park & Nail Spa leads at a perfect 5.0★ across 1,312 reviews, the largest review count of any 5.0-rated salon in Houston."
        neighborhoodNote="The northwest side carries real weight in this data: Vella Bella (TX-249), La Belle Vie Nail Spa (Antoine Dr), and The Art of Face (W Greens Rd) all sit within a few miles of each other along the Beltway 8/TX-249 corridor. On the review-volume side, Milano Nail Spa Memorial's 3,463 reviews is the single highest review count across every list on this site — shops or salons, in any of the four cities covered."
        topRated={topRated}
        mostReviewed={mostReviewed}
        faqs={[
          {
            question: "What is the best salon in Houston?",
            answer: "Vella Bella Salon Park & Nail Spa, at 13572 TX-249 in northwest Houston, holds the highest combination of rating and review volume — a perfect 5.0★ across 1,312 real Google reviews.",
          },
          {
            question: "How many salons in Houston are highly rated?",
            answer: "1,027 real, currently-listed Houston salons carry a rating of 4.5★ or higher with at least 5 reviews — out of 1,358 salons in our database matched to the city.",
          },
          {
            question: "What's the difference between \"Top Rated\" and \"Most Reviewed\" on this page?",
            answer: "Top Rated ranks by rating first, using review count only as a tiebreaker — it surfaces excellent salons regardless of size. Most Reviewed ranks by raw review volume among salons rated 4.0★ or higher — it surfaces the highest-traffic, most-proven salons, led here by Milano Nail Spa Memorial's 3,463 reviews.",
          },
          {
            question: "Where are Houston's best salons located?",
            answer: "The data shows a real concentration along the Beltway 8/TX-249 corridor on the northwest side, home to three of the ten highest-rated salons in the city, including the top-ranked Vella Bella Salon Park & Nail Spa.",
          },
        ]}
      />
    </>
  );
}
