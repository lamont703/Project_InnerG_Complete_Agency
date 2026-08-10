import { BestOfDirectory, type BestOfEntry } from "@/components/best-of/BestOfDirectory";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";

export const metadata = {
  title: "Best Barbershops in Dallas (2026) — Top Rated, Real Reviews",
  description:
    "The 10 highest-rated barbershops in Dallas, ranked by real Google rating and review count — led by Sauccy Fades Dallas Barbershop at 5.0★ across 517 reviews. 57 real shops clear our 4.5+ rating threshold.",
  keywords: [
    "best barbershops in Dallas",
    "best barbershop Dallas",
    "top rated barbershop Dallas",
    "highest rated barbershop Dallas 2026",
    "best fade Dallas",
  ],
  openGraph: {
    title: "Best Barbershops in Dallas (2026)",
    description: "The real, highest-rated barbershops in Dallas — ranked by live Google rating and review count.",
    url: `${SITE_URL}/best-barbershops-in-dallas`,
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Best Barbershops in Dallas (2026)",
    description: "Real, highest-rated barbershops in Dallas — ranked by live rating and review count.",
  },
  alternates: { canonical: `${SITE_URL}/best-barbershops-in-dallas` },
};

const topRated: BestOfEntry[] = [
  { name: "Sauccy Fades Dallas Barbershop", address: "11909 Preston Rd, Dallas, TX 75230", rating: 5.0, reviews: 517, slug: "sauccy-fades-dallas-barbershop-dallas-941152ec" },
  { name: "Virtus Barber and Co", address: "6224 La Vista Dr, Dallas, TX 75214", rating: 5.0, reviews: 468, slug: "virtus-barber-and-co-dallas-b029a532" },
  { name: "East Dallas Barbershop", address: "2327 Gus Thomasson Rd, Dallas, TX 75228", rating: 5.0, reviews: 411, slug: "east-dallas-barbershop-dallas-7dfe36c7" },
  { name: "Brownie's", address: "4317 Lemmon Ave A, Dallas, TX 75219", rating: 5.0, reviews: 379, slug: "brownie-s-dallas-f22f1aa9" },
  { name: "Atelier Barber Co.", address: "3904 Cedar Springs Rd, Dallas, TX 75219", rating: 5.0, reviews: 379, slug: "atelier-barber-co-dallas-aa8665f3" },
  { name: "Whiskey Den Barbershop", address: "3321 Oak Lawn Ave, Dallas, TX 75219", rating: 5.0, reviews: 376, slug: "whiskey-den-barbershop-dallas-aa38ffe0" },
  { name: "HQ Barbershop", address: "3527 Oak Lawn Ave, Dallas, TX 75219", rating: 5.0, reviews: 351, slug: "hq-barbershop-dallas-59a7616d" },
  { name: "Premier Barber Lounge", address: "7995 LBJ Freeway Unit 103, Dallas, TX 75251", rating: 5.0, reviews: 321, slug: "premier-barber-lounge-dallas-908b5e58" },
  { name: "Ben's Luxe Barber", address: "9100 N Central Expy, Dallas, TX 75231", rating: 5.0, reviews: 212, slug: "ben-s-luxe-barber-dallas-6bcf580e" },
  { name: "Cool Heads Barbershop (Mockingbird Station)", address: "5307 E Mockingbird Ln #140, Dallas, TX 75206", rating: 5.0, reviews: 176, slug: "cool-heads-barbershop-dallas-mocking-bird-station-dallas-ebf73808" },
];

const mostReviewed: BestOfEntry[] = [
  { name: "Scissors & Scotch", address: "100 Crescent Ct Ste 150, Dallas, TX 75201", rating: 4.9, reviews: 2051, slug: "scissors-scotch-dallas-e9613a4e" },
  { name: "Exclusive Men's Grooming Barber/Grooming Spa", address: "17630 Davenport Rd #106, Dallas, TX 75252", rating: 4.9, reviews: 942, slug: "exclusive-men-s-grooming-barber-grooming-spa-dallas-66b76828" },
  { name: "Five Star Barber", address: "6780 Abrams Rd 209 Suite 204, Dallas, TX 75231", rating: 4.8, reviews: 821, slug: "five-star-barber-dallas-35f86295" },
  { name: "Kutinfed Barbershop", address: "6514 Skillman St, Dallas, TX 75231", rating: 4.8, reviews: 811, slug: "kutinfed-barbershop-dallas-021467a5" },
  { name: "The Goat Barbershop", address: "9625 Plano Rd #300, Dallas, TX 75238", rating: 4.9, reviews: 595, slug: "the-goat-barbershop-dallas-d2dfff35" },
];

export default function BestBarbershopsDallas() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "BreadcrumbList",
            "@id": `${SITE_URL}/best-barbershops-in-dallas#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Dallas", item: `${SITE_URL}/texas/dallas` },
              { "@type": "ListItem", position: 3, name: "Best Barbershops in Dallas", item: `${SITE_URL}/best-barbershops-in-dallas` },
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
            "@id": `${SITE_URL}/best-barbershops-in-dallas#itemlist`,
            name: "Best Barbershops in Dallas",
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
                url: `${SITE_URL}/shop/${s.slug}`,
              },
            })),
          },
          )),
        }}
      />
      <BestOfDirectory
        city="Dallas"
        category="Barbershops"
        profileBasePath="/shop"
        searchTab="Barbershops"
        totalQualifying={57}
        minRating={4.5}
        minReviews={5}
        updatedLabel="July 2026"
        intro="57 real Dallas barbershops clear a 4.5★ rating with at least 5 reviews, out of 67 we could confidently match to the city. Sauccy Fades Dallas Barbershop leads at a perfect 5.0★ across 517 reviews."
        neighborhoodNote="Uptown Dallas dominates this list in a way none of the other three cities show for a single neighborhood: Whiskey Den Barbershop, HQ Barbershop, Atelier Barber Co., and Brownie's all sit on or within a mile of Oak Lawn Ave and Cedar Springs Rd — four of the top ten shops in one small district."
        topRated={topRated}
        mostReviewed={mostReviewed}
        faqs={[
          {
            question: "What is the best barbershop in Dallas?",
            answer: "Sauccy Fades Dallas Barbershop, on Preston Rd, holds a perfect 5.0★ rating across 517 real Google reviews — the top combination of rating and volume in the city.",
          },
          {
            question: "How many barbershops in Dallas are highly rated?",
            answer: "57 real, currently-listed Dallas barbershops carry a rating of 4.5★ or higher with at least 5 reviews — out of 67 shops in our database matched to the city.",
          },
          {
            question: "What's the difference between \"Top Rated\" and \"Most Reviewed\" on this page?",
            answer: "Top Rated ranks by rating first, using review count only as a tiebreaker. Most Reviewed ranks by raw review volume among shops rated 4.0★ or higher, led here by Scissors & Scotch's 2,051 reviews.",
          },
          {
            question: "Where are Dallas's best barbershops located?",
            answer: "Uptown Dallas, specifically the Oak Lawn Ave and Cedar Springs Rd corridor, is the real standout — four of the ten highest-rated shops in the city sit within about a mile of each other there.",
          },
        ]}
      />
    </>
  );
}
