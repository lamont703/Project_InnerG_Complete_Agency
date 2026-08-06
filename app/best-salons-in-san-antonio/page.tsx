import { BestOfDirectory, type BestOfEntry } from "@/components/best-of/BestOfDirectory";
import { SITE_URL } from "@/lib/site";

export const metadata = {
  title: "Best-Rated Salons in San Antonio (2026) — Top Rated, Real Reviews",
  description:
    "The 10 highest-rated hair salons in San Antonio, ranked by real Google rating and review count — led by Pure Glam Hair and Makeup at 5.0★ across 427 reviews. 40 real salons clear our 4.5+ rating threshold.",
  keywords: [
    "best salons in San Antonio",
    "best hair salon San Antonio",
    "top rated salon San Antonio",
    "highest rated hair salon San Antonio 2026",
  ],
  openGraph: {
    title: "Best-Rated Salons in San Antonio (2026)",
    description: "The real, highest-rated hair salons in San Antonio — ranked by live Google rating and review count.",
    url: `${SITE_URL}/best-salons-in-san-antonio`,
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Best-Rated Salons in San Antonio (2026)",
    description: "Real, highest-rated salons in San Antonio — ranked by live rating and review count.",
  },
  alternates: { canonical: `${SITE_URL}/best-salons-in-san-antonio` },
};

const topRated: BestOfEntry[] = [
  { name: "Pure Glam Hair and Makeup", address: "8600 Wurzbach Rd #1202a, San Antonio, TX 78240", rating: 5.0, reviews: 427, slug: "pure-glam-hair-and-makeup-san-antonio-5dbc4096" },
  { name: "Le Chic Esthetics Spa Suite", address: "5742 W Loop 1604 N Ste 114, Room 31, San Antonio, TX 78251", rating: 5.0, reviews: 140, slug: "le-chic-esthetics-spa-suite-san-antonio-a545ada1" },
  { name: "Skin Bliss The Laser Spa Clinic & Aesthetics Institute", address: "14855 Blanco Rd Ste 100, San Antonio, TX 78216", rating: 5.0, reviews: 75, slug: "skin-bliss-the-laser-spa-clinic-aesthetics-institute-san-antonio-45b2aead" },
  { name: "Seventwenty Collective", address: "4831 Fredericksburg Rd, San Antonio, TX 78229", rating: 4.9, reviews: 445, slug: "seventwenty-collective-san-antonio-0be78b7c" },
  { name: "Bella Rose Salon", address: "4885 Fredericksburg Rd, San Antonio, TX 78229", rating: 4.9, reviews: 445, slug: "bella-rose-salon-san-antonio-fc1655c3" },
  { name: "Beauty Haus, Spa + Lash Lift Bar", address: "119 Heiman St Ste 300, San Antonio, TX 78205", rating: 4.9, reviews: 152, slug: "beauty-haus-spa-lash-lift-bar-san-antonio-f3a6114e" },
  { name: "Hair Couture & Beauty INK Lounge", address: "3030 Thousand Oaks Dr, San Antonio, TX 78247", rating: 4.9, reviews: 115, slug: "hair-couture-beauty-ink-lounge-san-antonio-94dff504" },
  { name: "Lux Salon", address: "3915 San Pedro Ave Ste 106, San Antonio, TX 78212", rating: 4.9, reviews: 115, slug: "lux-salon-san-antonio-2e35ba9d" },
  { name: "L & J Beauty Studio", address: "1615 McCullough Ave, San Antonio, TX 78212", rating: 4.9, reviews: 88, slug: "l-j-beauty-studio-san-antonio-90a3afa4" },
  { name: "Avalon Hair Designs", address: "20079 Stone Oak Pkwy #1107, San Antonio, TX 78258", rating: 4.9, reviews: 47, slug: "avalon-hair-designs-san-antonio-7424e19f" },
];

const mostReviewed: BestOfEntry[] = [
  { name: "Velvet Hair Salon and Spa", address: "20210 Stone Oak Pkwy #208, San Antonio, TX 78258", rating: 4.6, reviews: 996, slug: "velvet-hair-salon-and-spa-san-antonio-08f71224" },
  { name: "Salon 555", address: "555 E Basse Rd Ste 116, San Antonio, TX 78209", rating: 4.8, reviews: 665, slug: "salon-555-san-antonio-4b47300c" },
  { name: "LOOK", address: "824 Broadway Unit 101, San Antonio, TX 78215", rating: 4.8, reviews: 665, slug: "look-san-antonio-ae307a3a" },
  { name: "Seventwenty Collective", address: "4831 Fredericksburg Rd, San Antonio, TX 78229", rating: 4.9, reviews: 445, slug: "seventwenty-collective-san-antonio-0be78b7c" },
  { name: "Bella Rose Salon", address: "4885 Fredericksburg Rd, San Antonio, TX 78229", rating: 4.9, reviews: 445, slug: "bella-rose-salon-san-antonio-fc1655c3" },
  { name: "Brooks City Base Hair Salon", address: "3138 SE Military Dr Ste 109, San Antonio, TX 78235", rating: 4.7, reviews: 405, slug: "brooks-city-base-hair-salon-san-antonio-d60aa30b" },
];

export default function BestSalonsSanAntonio() {
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
              { "@type": "ListItem", position: 3, name: "Best-Rated Salons in San Antonio", item: `${SITE_URL}/best-salons-in-san-antonio` },
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
            name: "Best-Rated Salons in San Antonio",
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
        city="San Antonio"
        category="Salons"
        profileBasePath="/salons"
        searchTab="Salons"
        totalQualifying={40}
        minRating={4.5}
        minReviews={5}
        updatedLabel="July 2026"
        intro="40 real San Antonio salons clear a 4.5★ rating with at least 5 reviews, out of 52 we could confidently match to the city. Pure Glam Hair and Makeup leads at a perfect 5.0★ across 427 reviews, the strongest rating-and-volume combination in the city."
        neighborhoodNote="Fredericksburg Rd near the Medical Center is a real, tight cluster: Seventwenty Collective and Bella Rose Salon sit at the 4831 and 4885 addresses on the same block, both tied at 4.9★ with 445 reviews each — the same corridor that also produces two of San Antonio's top-rated barbershops, making it the city's one true dual barbershop-and-salon hub."
        topRated={topRated}
        mostReviewed={mostReviewed}
        faqs={[
          {
            question: "What is the best salon in San Antonio?",
            answer: "Pure Glam Hair and Makeup, on Wurzbach Rd, holds a perfect 5.0★ rating across 427 real Google reviews — the top combination of rating and volume in the city.",
          },
          {
            question: "How many salons in San Antonio are highly rated?",
            answer: "40 real, currently-listed San Antonio salons carry a rating of 4.5★ or higher with at least 5 reviews — out of 52 salons in our database matched to the city.",
          },
          {
            question: "What's the difference between \"Top Rated\" and \"Most Reviewed\" on this page?",
            answer: "Top Rated ranks by rating first, using review count only as a tiebreaker. Most Reviewed ranks by raw review volume among salons rated 4.0★ or higher, led here by Velvet Hair Salon and Spa's 996 reviews.",
          },
          {
            question: "Where are San Antonio's best salons located?",
            answer: "The Fredericksburg Rd corridor near the Medical Center is a real, tight cluster — Seventwenty Collective and Bella Rose Salon sit blocks apart, both tied at 4.9★, and the same corridor also produces two of the city's top-rated barbershops.",
          },
        ]}
      />
    </>
  );
}
