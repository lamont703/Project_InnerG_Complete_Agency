import { BestOfDirectory, type BestOfEntry } from "@/components/best-of/BestOfDirectory";

export const metadata = {
  title: "Best Barbershops in Austin (2026) — Top Rated, Real Reviews | Inner G Complete",
  description:
    "The 10 highest-rated barbershops in Austin, ranked by real Google rating and review count — led by Barbers X Alkemy at 5.0★ across 426 reviews. 44 real shops clear our 4.5+ rating threshold.",
  keywords: [
    "best barbershops in Austin",
    "best barbershop Austin",
    "top rated barbershop Austin",
    "highest rated barbershop Austin 2026",
    "best fade Austin TX",
  ],
  openGraph: {
    title: "Best Barbershops in Austin (2026)",
    description: "The real, highest-rated barbershops in Austin — ranked by live Google rating and review count.",
    url: "https://agency.innergcomplete.com/best-barbershops-in-austin",
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "Best Barbershops in Austin (2026)",
    description: "Real, highest-rated barbershops in Austin — ranked by live rating and review count.",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/best-barbershops-in-austin" },
};

const topRated: BestOfEntry[] = [
  { name: "Barbers X Alkemy", address: "5312 Airport Blvd # C, Austin, TX 78751", rating: 5.0, reviews: 426, slug: "barbers-x-alkemy-austin-6dde8dc4" },
  { name: "The Shop ATX", address: "301 Chicon St Unit E, Austin, TX 78702", rating: 5.0, reviews: 288, slug: "the-shop-atx-austin-86115535" },
  { name: "Monarch Barbershop", address: "3435 Greystone Dr Suite 102, Austin, TX 78731", rating: 5.0, reviews: 200, slug: "monarch-barbershop-austin-6b3b1abe" },
  { name: "Beardbrand Barbershop", address: "1003 E 52nd St, Austin, TX 78751", rating: 5.0, reviews: 157, slug: "beardbrand-barbershop-austin-e1efec6c" },
  { name: "SHED Barber and Supply Bouldin", address: "2210 S 1st St, Austin, TX 78704", rating: 5.0, reviews: 157, slug: "shed-barber-and-supply-bouldin-austin-a9b5f7b1" },
  { name: "Beard's Barbershop", address: "2900 S Congress Ave #207, Austin, TX 78704", rating: 5.0, reviews: 155, slug: "beard-s-barbershop-austin-e02d18e5" },
  { name: "Man Cave Barbershop", address: "2901 S Capital of Texas Hwy Suite 12, Austin, TX 78746", rating: 5.0, reviews: 151, slug: "man-cave-barbershop-austin-6e063d3c" },
  { name: "Barbershop 808", address: "215 W N Loop Blvd, Austin, TX 78751", rating: 5.0, reviews: 147, slug: "barbershop-808-austin-8fb423ba" },
  { name: "Common Space Barbershop", address: "2605 Jones Rd Suite E, Austin, TX 78745", rating: 5.0, reviews: 133, slug: "common-space-barbershop-austin-adeaa6ef" },
  { name: "737 Barbershop", address: "403 E Ben White Blvd Unit C, Austin, TX 78704", rating: 5.0, reviews: 86, slug: "737-barbershop-austin-09b3256b" },
];

const mostReviewed: BestOfEntry[] = [
  { name: "Priince Scissors Hair Studio", address: "2110 W Slaughter Ln #160, Austin, TX 78748", rating: 4.9, reviews: 659, slug: "priince-scissors-hair-studio-austin-3577c362" },
  { name: "The Rosewood Barbershop", address: "1010 Lydia St, Austin, TX 78702", rating: 4.9, reviews: 596, slug: "the-rosewood-barbershop-austin-0d0e3b97" },
  { name: "South Austin Barber Shop (Stassney Lane)", address: "607 W Stassney Ln, Austin, TX 78745", rating: 4.9, reviews: 596, slug: "south-austin-barber-shop-stassney-lane-austin-4f855004" },
  { name: "Sorek", address: "1813 E 6th St Ste 1813B, Austin, TX 78702", rating: 4.9, reviews: 596, slug: "sorek-austin-d0e353d2" },
  { name: "Olde Soul Barbershop", address: "1614 E 6th St Unit 115, Austin, TX 78702", rating: 4.9, reviews: 567, slug: "olde-soul-barbershop-austin-433d6bfc" },
  { name: "Honest Barber", address: "5436 Burnet Rd, Austin, TX 78756", rating: 4.7, reviews: 482, slug: "honest-barber-austin-34f1abd6" },
];

export default function BestBarbershopsAustin() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://agency.innergcomplete.com" },
              { "@type": "ListItem", position: 2, name: "Austin", item: "https://agency.innergcomplete.com/texas/austin" },
              { "@type": "ListItem", position: 3, name: "Best Barbershops in Austin", item: "https://agency.innergcomplete.com/best-barbershops-in-austin" },
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
            name: "Best Barbershops in Austin",
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
                url: `https://agency.innergcomplete.com/shop/${s.slug}`,
              },
            })),
          }),
        }}
      />
      <BestOfDirectory
        city="Austin"
        category="Barbershops"
        profileBasePath="/shop"
        searchTab="Barbershops"
        totalQualifying={44}
        minRating={4.5}
        minReviews={5}
        updatedLabel="July 2026"
        intro="Austin is a much tighter market than Houston — 44 real barbershops clear a 4.5★ rating with at least 5 reviews, out of 51 we could confidently match to the city. Barbers X Alkemy leads at a perfect 5.0★ across 426 reviews, well ahead of the rest of the field on review volume alone."
        neighborhoodNote="East Austin and South Congress carry this list: The Shop ATX and Olde Soul Barbershop sit on Chicon St and E 6th St in East Austin, while Beard's Barbershop and Common Space Barbershop cluster along S Congress Ave and Jones Rd just south of the river — a real east/south split rather than one dominant strip, distinct from Houston's suburban-corridor pattern."
        topRated={topRated}
        mostReviewed={mostReviewed}
        faqs={[
          {
            question: "What is the best barbershop in Austin?",
            answer: "Barbers X Alkemy, at 5312 Airport Blvd, holds the highest combination of rating and review volume in Austin — a perfect 5.0★ across 426 real Google reviews.",
          },
          {
            question: "How many barbershops in Austin are highly rated?",
            answer: "44 real, currently-listed Austin barbershops carry a rating of 4.5★ or higher with at least 5 reviews — out of 51 shops in our database matched to the city, a much smaller pool than Houston's.",
          },
          {
            question: "What's the difference between \"Top Rated\" and \"Most Reviewed\" on this page?",
            answer: "Top Rated ranks by rating first, using review count only as a tiebreaker — it surfaces excellent shops regardless of size. Most Reviewed ranks by raw review volume among shops rated 4.0★ or higher — it surfaces the highest-traffic, most-proven shops in the city.",
          },
          {
            question: "Where are Austin's best barbershops located?",
            answer: "The data splits into two real clusters: East Austin along Chicon St and E 6th St, and South Austin along S Congress Ave — rather than one dominant corridor.",
          },
        ]}
      />
    </>
  );
}
