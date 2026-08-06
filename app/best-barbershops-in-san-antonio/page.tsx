import { BestOfDirectory, type BestOfEntry } from "@/components/best-of/BestOfDirectory";
import { SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Best Barbershops in San Antonio (2026) — Top Rated, Real Reviews",
  description:
    "The 10 highest-rated barbershops in San Antonio, ranked by real Google rating and review count — led by Fineline Barbershop #3 at 5.0★ across 1,152 reviews. 56 real shops clear our 4.5+ rating threshold.",
  keywords: [
    "best barbershops in San Antonio",
    "best barbershop San Antonio",
    "top rated barbershop San Antonio",
    "highest rated barbershop San Antonio 2026",
  ],
  openGraph: {
    title: "Best Barbershops in San Antonio (2026)",
    description: "The real, highest-rated barbershops in San Antonio — ranked by live Google rating and review count.",
    url: `${SITE_URL}/best-barbershops-in-san-antonio`,
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Best Barbershops in San Antonio (2026)",
    description: "Real, highest-rated barbershops in San Antonio — ranked by live rating and review count.",
  },
  alternates: { canonical: `${SITE_URL}/best-barbershops-in-san-antonio` },
};

const topRated: BestOfEntry[] = [
  { name: "Fineline Barbershop #3", address: "11398 Bandera Rd #205, San Antonio, TX 78250", rating: 5.0, reviews: 1152, slug: "fineline-barbershop-3-san-antonio-76205277" },
  { name: "Champions Barber Lounge", address: "1255 SW Loop 410 #133, San Antonio, TX 78227", rating: 5.0, reviews: 1099, slug: "champions-barber-lounge-san-antonio-131ef089" },
  { name: "Prestige Barbershop", address: "2606 TPC Pkwy Suite 108, San Antonio, TX 78259", rating: 5.0, reviews: 890, slug: "prestige-barbershop-san-antonio-01a28412" },
  { name: "High End Barber Shop", address: "16613 Huebner Rd, San Antonio, TX 78248", rating: 5.0, reviews: 622, slug: "high-end-barber-shop-san-antonio-8ddcf2b6" },
  { name: "La Barberìa Barbershop", address: "5152 Fredericksburg Rd #146, San Antonio, TX 78229", rating: 5.0, reviews: 248, slug: "la-barber-a-barbershop-san-antonio-97a0298c" },
  { name: "DNYce Cutz Brooklyn Barbershop", address: "5205 Fredericksburg Rd Suite #104, San Antonio, TX 78229", rating: 5.0, reviews: 219, slug: "dnyce-cutz-brooklyn-barbershop-san-antonio-c3fee558" },
  { name: "Over the Top Barbershop", address: "6387 Babcock Rd #6, San Antonio, TX 78240", rating: 5.0, reviews: 133, slug: "over-the-top-barbershop-san-antonio-0056e807" },
  { name: "Prestige Barber Co", address: "11840 Alamo Ranch Pkwy Suite 50, San Antonio, TX 78253", rating: 5.0, reviews: 94, slug: "prestige-barber-co-san-antonio-b321f013" },
  { name: "Better Days Barbershop", address: "1927 N St Mary's St, San Antonio, TX 78212", rating: 5.0, reviews: 65, slug: "better-days-barbershop-san-antonio-3b0c0805" },
  { name: "Urban City Barbershop — The Beard Experts", address: "849 E Commerce St #748, San Antonio, TX 78205", rating: 4.9, reviews: 3271, slug: "urban-city-barbershop-the-beard-experts-san-antonio-fcec10d4" },
];

const mostReviewed: BestOfEntry[] = [
  { name: "Urban City Barbershop — The Beard Experts", address: "849 E Commerce St #748, San Antonio, TX 78205", rating: 4.9, reviews: 3271, slug: "urban-city-barbershop-the-beard-experts-san-antonio-fcec10d4" },
  { name: "High End Barber Shop", address: "20210 Stone Oak Pkwy, San Antonio, TX 78258", rating: 4.9, reviews: 1416, slug: "high-end-barber-shop-san-antonio-7e53bf6a" },
  { name: "Thousand Oaks Barber Shop", address: "4536 Thousand Oaks Dr, San Antonio, TX 78233", rating: 4.9, reviews: 975, slug: "thousand-oaks-barber-shop-san-antonio-e11feeb3" },
  { name: "Slicks Barber Studio", address: "9400 Perrin Beitel #102, San Antonio, TX 78217", rating: 4.9, reviews: 965, slug: "slicks-barber-studio-san-antonio-9c5a9937" },
  { name: "Top Tier Barber Studio", address: "5714 Northwest Loop 410, San Antonio, TX 78238", rating: 4.9, reviews: 717, slug: "top-tier-barber-studio-san-antonio-eb3b6b19" },
];

export default function BestBarbershopsSanAntonio() {
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
              { "@type": "ListItem", position: 2, name: "San Antonio", item: `${SITE_URL}/texas/san-antonio` },
              { "@type": "ListItem", position: 3, name: "Best Barbershops in San Antonio", item: `${SITE_URL}/best-barbershops-in-san-antonio` },
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
            name: "Best Barbershops in San Antonio",
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
          }),
        }}
      />
      <BestOfDirectory
        city="San Antonio"
        category="Barbershops"
        profileBasePath="/shop"
        searchTab="Barbershops"
        totalQualifying={56}
        minRating={4.5}
        minReviews={5}
        updatedLabel="July 2026"
        intro="56 real San Antonio barbershops clear a 4.5★ rating with at least 5 reviews, out of 65 we could confidently match to the city. Nine shops share a perfect 5.0★, but Urban City Barbershop — The Beard Experts downtown on E Commerce St carries 3,271 reviews, the single highest review count of any shop across all four cities in this series."
        neighborhoodNote="Two real corridors show up in the data: Bandera Rd and Loop 410 on the west/northwest side (Fineline Barbershop #3, Champions Barber Lounge, Prestige Barber Co), and Fredericksburg Rd near the Medical Center (La Barberìa Barbershop, DNYce Cutz Brooklyn Barbershop). Urban City Barbershop downtown stands apart from both — it's the review-volume outlier of the whole list."
        topRated={topRated}
        mostReviewed={mostReviewed}
        faqs={[
          {
            question: "What is the best barbershop in San Antonio?",
            answer: "Fineline Barbershop #3 on Bandera Rd holds a perfect 5.0★ with 1,152 reviews, the highest-rated shop with substantial review volume — while Urban City Barbershop — The Beard Experts downtown has the single highest review count in the city at 3,271, at a very close 4.9★.",
          },
          {
            question: "How many barbershops in San Antonio are highly rated?",
            answer: "56 real, currently-listed San Antonio barbershops carry a rating of 4.5★ or higher with at least 5 reviews — out of 65 shops in our database matched to the city.",
          },
          {
            question: "What's the difference between \"Top Rated\" and \"Most Reviewed\" on this page?",
            answer: "Top Rated ranks by rating first, using review count only as a tiebreaker. Most Reviewed ranks by raw review volume among shops rated 4.0★ or higher — Urban City Barbershop's 3,271 reviews is the highest of any shop in any of the four cities covered on this site.",
          },
          {
            question: "Where are San Antonio's best barbershops located?",
            answer: "Two real clusters stand out: the Bandera Rd/Loop 410 corridor on the west side, and Fredericksburg Rd near the Medical Center — plus a standout downtown shop on E Commerce St with the highest review count in the city.",
          },
        ]}
      />
    </>
  );
}
