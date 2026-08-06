import { BestOfDirectory, type BestOfEntry } from "@/components/best-of/BestOfDirectory";
import { SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Best Barbershops in Houston (2026) — Top Rated, Real Reviews",
  description:
    "The 10 highest-rated barbershops in Houston, ranked by real Google rating and review count — led by Fade Da Nawf at 5.0★ across 1,345 reviews. 457 real shops clear our 4.5+ rating threshold.",
  keywords: [
    "best barbershops in Houston",
    "best barbershop Houston",
    "top rated barbershop Houston",
    "highest rated barbershop Houston 2026",
    "best fade Houston",
  ],
  openGraph: {
    title: "Best Barbershops in Houston (2026)",
    description: "The real, highest-rated barbershops in Houston — ranked by live Google rating and review count.",
    url: `${SITE_URL}/best-barbershops-in-houston`,
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Best Barbershops in Houston (2026)",
    description: "Real, highest-rated barbershops in Houston — ranked by live rating and review count.",
  },
  alternates: { canonical: `${SITE_URL}/best-barbershops-in-houston` },
};

const topRated: BestOfEntry[] = [
  { name: "Fade Da Nawf", address: "8300 Antoine Dr Suite E, Houston, TX 77088", rating: 5.0, reviews: 1345, slug: "fade-da-nawf-houston-ccd78e77" },
  { name: "Jay's Barbershop & Shave Parlor", address: "3415 Oak Forest Dr # A, Houston, TX 77018", rating: 5.0, reviews: 852, slug: "jay-s-barbershop-shave-parlor-houston-e7773608" },
  { name: "Exclusive Fadez", address: "4444 FM 1960 W Ste 2, Houston, TX 77068", rating: 5.0, reviews: 565, slug: "exclusive-fadez-houston-77090-ede15688" },
  { name: "Premier Barbershop", address: "4996 Hwy 6 N, Houston, TX 77084", rating: 5.0, reviews: 534, slug: "premier-barbershop-houston-77095-59974f04" },
  { name: "Sarath's Barbershop", address: "3422 Ella Blvd, Houston, TX 77018", rating: 5.0, reviews: 504, slug: "sarath-s-barbershop-houston-6034ce09" },
  { name: "Fresh Cuts Hair Salon (Arab Barber)", address: "3105 Fondren Rd, Houston, TX 77063", rating: 5.0, reviews: 474, slug: "fresh-cuts-hair-salon-arab-barber-houston-77085-e2f4c8f1" },
  { name: "Luis Gabriel Cuban Barber Shop", address: "15207 Vickery Dr Suite B, Houston, TX 77086", rating: 5.0, reviews: 459, slug: "luis-gabriel-cuban-barber-shop-houston-77086-8841b901" },
  { name: "Bell Barbershop Style", address: "16243 FM 529, Houston, TX 77095", rating: 5.0, reviews: 392, slug: "bell-barbershop-style-houston-77095-abb3a758" },
  { name: "Deiner's Deep Cutz On The Go", address: "17000 El Camino Real Suite 301B, Houston, TX 77062", rating: 5.0, reviews: 363, slug: "deiner-s-deep-cutz-on-the-go-houston-77062-eb5625ef" },
  { name: "Sirsam Barbershop", address: "6430 Richmond Ave, Houston, TX 77057", rating: 5.0, reviews: 328, slug: "sirsam-barbershop-houston-77085-7b279cd8" },
];

const mostReviewed: BestOfEntry[] = [
  { name: "Professional Hair Salon | Barber Shop", address: "7613 Westheimer Rd, Houston, TX 77063", rating: 4.7, reviews: 1726, slug: "professional-hair-salon-barber-shop-houston-77057-9b88f6a2" },
  { name: "007 Barbershop", address: "5801 Memorial Dr Suite B, Houston, TX 77007", rating: 4.9, reviews: 1110, slug: "007-barbershop-houston-e6cd460e" },
  { name: "Cozy Barbershop", address: "2814 S Shepherd Dr Unit C, Houston, TX 77098", rating: 4.9, reviews: 1080, slug: "cozy-barbershop-houston-de00e31d" },
  { name: "House of Fades Cypress", address: "10924 FM 1960 W, Houston, TX 77070", rating: 4.9, reviews: 1026, slug: "house-of-fades-cypress-houston-77070-92e67366" },
  { name: "Hair Fashion Salon", address: "8057 Kirby Dr, Houston, TX 77054", rating: 4.8, reviews: 1018, slug: "hair-fashion-salon-houston-77054-379bf30e" },
  { name: "V's Barbershop — Houston Energy Corridor", address: "1560 Eldridge Pkwy Ste 174, Houston, TX 77077", rating: 4.8, reviews: 1004, slug: "v-s-barbershop-houston-energy-corridor-houston-77079-a83114c3" },
];

export default function BestBarbershopsHouston() {
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
              { "@type": "ListItem", position: 2, name: "Houston", item: `${SITE_URL}/texas/houston` },
              { "@type": "ListItem", position: 3, name: "Best Barbershops in Houston", item: `${SITE_URL}/best-barbershops-in-houston` },
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
            name: "Best Barbershops in Houston",
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
        city="Houston"
        category="Barbershops"
        profileBasePath="/shop"
        searchTab="Barbershops"
        totalQualifying={457}
        minRating={4.5}
        minReviews={5}
        updatedLabel="July 2026"
        intro="Houston has more real, rated barbershops than San Antonio, Austin, and Dallas combined — 457 shops clear a 4.5★ rating with at least 5 reviews, out of 526 shops we could confidently match to the city. Fade Da Nawf leads the field at a perfect 5.0★ across 1,345 reviews, the single most-reviewed 5-star shop in the metro."
        neighborhoodNote="Two real clusters stand out in the data: the FM 1960 / FM 529 corridor in northwest Houston (Exclusive Fadez, Bell Barbershop Style) and the Oak Forest / Ella Blvd stretch just north of the 610 Loop (Jay's Barbershop & Shave Parlor, Sarath's Barbershop) — both areas post multiple 5.0★ shops with real, substantial review counts rather than a single outlier."
        topRated={topRated}
        mostReviewed={mostReviewed}
        faqs={[
          {
            question: "What is the best barbershop in Houston?",
            answer: "Fade Da Nawf, at 8300 Antoine Dr in northwest Houston, holds the highest combination of rating and review volume — a perfect 5.0★ across 1,345 real Google reviews.",
          },
          {
            question: "How many barbershops in Houston are highly rated?",
            answer: "457 real, currently-listed Houston barbershops carry a rating of 4.5★ or higher with at least 5 reviews — out of 526 shops in our database matched to the city.",
          },
          {
            question: "What's the difference between \"Top Rated\" and \"Most Reviewed\" on this page?",
            answer: "Top Rated ranks by rating first, using review count only as a tiebreaker — it surfaces excellent shops regardless of size. Most Reviewed ranks by raw review volume among shops rated 4.0★ or higher — it surfaces the highest-traffic, most-proven shops, which tend to be larger or longer-established.",
          },
          {
            question: "Where are Houston's best barbershops located?",
            answer: "The data shows two real concentrations: the FM 1960/FM 529 corridor in northwest Houston, and the Oak Forest/Ella Blvd area just north of the 610 Loop — both have multiple 5.0★ shops with hundreds of reviews each.",
          },
        ]}
      />
    </>
  );
}
