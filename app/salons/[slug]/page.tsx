import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { Navbar } from "@/components/layout/navbar";
import { ClaimShopButton } from "@/components/shared/claim-shop-button";
import { WriteReviewButton } from "@/components/shared/write-review-button";
import { ReviewsSection } from "@/components/shared/reviews-section";
import { GoogleReviews } from "@/components/shared/google-reviews";
import { GooglePosts } from "@/components/shared/google-posts";
import { ShopPhotoGallery } from "@/components/shared/shop-photo-gallery";
import { NearbyEntitiesSection } from "@/components/shared/nearby-entities-section";
import { SalonSponsoredAd } from "@/components/ads/SalonSponsoredAd";
import { SearchVisibilityCard } from "@/components/shared/search-visibility-card";
import { fetchNearbyEntities } from "@/lib/nearby-entities";
import { buildEntityBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import {
  WIKIDATA, cityNode, entityId, faqId, faqNode, graphJson, identifiers,
  pageId, ref, regulatorFor, topics, webPageNode,
} from "@/lib/schema-graph";
import { computeShopEcosystemReport } from "@/lib/shop-ecosystem";
import { getApprovedReviews, computeReviewStats } from "@/lib/reviews";
import { BookAppointmentButton } from "@/components/book-appointment-modal";
import { servicesForEntity } from "@/lib/booking-services";
import { SALON_PUBLIC_COLUMNS } from "@/lib/public-columns";
import { composeDescription, ratingClause, streetClause } from "@/lib/seo-description";
import {MapPin, Mail, Clock, Navigation, Users, ExternalLink, Landmark, Store, CheckCircle2, ShieldCheck, Lock, Award, GraduationCap, TrendingUp, TrendingDown, ShoppingBag, Sparkles, Scissors, Info} from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { AddToShortlist } from "@/components/shortlist/add-to-shortlist";
import { OwnerGbpStrip } from "@/components/shortlist/owner-gbp-strip";
import { CompareNearby } from "@/components/shortlist/compare-nearby";
import { ServiceIntent } from "@/components/shortlist/service-intent";
import { fetchComparables } from "@/lib/shortlist";
import { cleanBusinessName, entityTitle } from "@/lib/entity-title";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_COLUMNS = SALON_PUBLIC_COLUMNS.join(", ");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getSalon(param: string) {
  const { data: bySlug, error: slugErr } = await supabase
    .from("agent_salon_leads")
    .select(PUBLIC_COLUMNS)
    .eq("slug", param)
    .single();
  if (!slugErr && bySlug) return bySlug as any;

  if (!UUID_RE.test(param)) return null;

  const { data: byId, error: idErr } = await supabase
    .from("agent_salon_leads")
    .select(PUBLIC_COLUMNS)
    .eq("id", param)
    .single();
  if (idErr || !byId) return null;
  return { ...(byId as any), _resolvedByLegacyId: true };
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const salon = await getSalon(slug);
  if (!salon) return { title: "Salon Not Found" };

  // Same hiring-aware title logic as app/shop/[slug]/page.tsx: only assert
  // "hiring" when a salon actually has a real signal, instead of every
  // page carrying the same near-duplicate low-quality title.
  const isHiring = !!(salon.hiring_need || (salon.booth_count_available && salon.booth_count_available >= 1));
  // Salons are 55% of the "<business> reviews" impressions — the largest single
  // slice of the cluster. See lib/entity-title.ts.
  const title = entityTitle({
    name: salon.shop_name,
    city: salon.city,
    rating: salon.rating,
    reviewCount: salon.total_reviews,
    kind: "Hair & Beauty Salon",
    isHiring,
    hiringTitle: `${cleanBusinessName(salon.shop_name)} is Hiring on Shop Day Network`,
  });
  const nearbyAreas: string[] = Array.isArray(salon.nearby_areas) ? salon.nearby_areas : [];

  // Mirrors app/shop/[slug]/page.tsx — same clause order, same fallbacks. Salon
  // records are thinner than shops (booth rent is null across the whole table
  // today), so the address and rating clauses carry most of these.
  const description = composeDescription([
    `${salon.shop_name} — hair & beauty salon${salon.city ? ` in ${salon.city}` : ""}${salon.address_state ? `, ${salon.address_state}` : ""}`,
    salon.booth_count_available
      ? `${salon.booth_count_available} chair${salon.booth_count_available > 1 ? "s" : ""} available${salon.rent_type ? ` (${salon.rent_type}${salon.rent_rate ? ` at $${salon.rent_rate}/week` : ""})` : ""}`
      : isHiring
      ? "Now hiring"
      : null,
    ratingClause(salon.rating, salon.total_reviews),
    streetClause(salon.formatted_address, salon.city),
    nearbyAreas.length > 0 ? `Also serving ${nearbyAreas.join(", ")}` : null,
    isHiring ? "See photos and request a Shop Day" : "See photos, hours and contact details",
  ]);
  const heroImage = (Array.isArray(salon.google_images) && salon.google_images[0]) || salon.shop_image_url || undefined;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/salons/${slug}` },
    openGraph: {
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

const TODAY_INDEX = (new Date().getDay() + 6) % 7; // 0 = Monday, matches Google's weekdayDescriptions order

// LocalBusiness — a salon is a physical business, distinct from the
// individual-professional Person schema used on barber/cosmetologist pages.
function buildSalonJsonLd(salon: any, websiteHref: string | null) {
  const path = `/salons/${salon.slug}`;
  const ld: Record<string, any> = {
    "@type": "HairSalon",
    "@id": entityId(path),
    // HairSalon is a real schema.org type, so unlike the barbershop page this
    // one does not need a concept to stand in for a missing type — the Wikidata
    // anchor is here to reconcile with outside indexes, not to compensate.
    additionalType: WIKIDATA.beautySalon,
    name: salon.shop_name,
    mainEntityOfPage: ref(pageId(path)),
  };
  // Claimed salons have real structured address fields (see the
  // 20260721000000 migration) — same split-PostalAddress precedence as
  // app/shop/[slug]/page.tsx.
  if (salon.street_address && salon.address_city) {
    ld.address = {
      "@type": "PostalAddress",
      streetAddress: salon.street_address,
      addressLocality: salon.address_city,
      addressRegion: salon.address_state || "TX",
      postalCode: salon.address_zip || undefined,
      addressCountry: "US",
    };
  } else if (salon.formatted_address) {
    ld.address = { "@type": "PostalAddress", streetAddress: salon.formatted_address, addressRegion: "TX", addressCountry: "US" };
  }
  if (salon.latitude && salon.longitude) ld.geo = { "@type": "GeoCoordinates", latitude: salon.latitude, longitude: salon.longitude };
  if (salon.phone) ld.telephone = salon.phone;
  if (websiteHref) ld.url = websiteHref;
  if (salon.rating && salon.total_reviews) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(salon.rating),
      reviewCount: Number(salon.total_reviews),
      bestRating: 5,
      worstRating: 1,
    };
  }
  const heroImg = (Array.isArray(salon.google_images) && salon.google_images[0]) || salon.shop_image_url || null;
  if (heroImg) ld.image = heroImg;
  // Real, computed proximity (lib/nearby-areas.ts), not a claimed service
  // area — a well-known nearby neighborhood within ~2.5mi, e.g. a real
  // Drybar in Uptown Park legitimately serving River Oaks searches
  // without being physically located there.
  //
  // Typed as Place nodes rather than bare strings, same reasoning as the shop
  // page: several of these are neighbourhoods, so Place is the honest type.
  if (Array.isArray(salon.nearby_areas) && salon.nearby_areas.length > 0) {
    ld.areaServed = salon.nearby_areas.map((a: string) => ({ "@type": "Place", name: a }));
  }
  const place = cityNode(salon.address_city || salon.city, salon.address_state || "TX");
  if (place) ld.containedInPlace = place;
  const ids = identifiers({ googlePlaceId: salon.place_id });
  if (ids) ld.identifier = ids;
  ld.knowsAbout = topics("cosmetology", "esthetics");
  return ld;
}

export default async function SalonProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const salon = await getSalon(slug);

  if (!salon) notFound();
  if (salon._resolvedByLegacyId) permanentRedirect(`/salons/${salon.slug}`);

  const ecosystemReport = await computeShopEcosystemReport(supabase, salon, "salon");
  const reviews = await getApprovedReviews("salon", salon.id);
  const { averageRating } = computeReviewStats(reviews);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: searchPerfRows } = await supabase.rpc('get_search_performance_by_entity', {
    p_entity_id: salon.id,
    p_result_type: 'salon',
    p_cutoff: thirtyDaysAgo,
  });
  const searchPerformance = (searchPerfRows && searchPerfRows[0]) || null;
  // claimed_at is set on agent_salon_leads by the claim/link flow (see
  // app/api/admin/community-entity-links POST, which sets it alongside the
  // community_member_entity_links row) — so a salon linked to a member
  // reads as claimed here exactly like a claimed shop, now that claimed_at
  // is included in SALON_PUBLIC_COLUMNS.
  const isClaimed = !!salon.claimed_at;
  const isHiring = !!(salon.hiring_need || (salon.booth_count_available && salon.booth_count_available >= 1));

  // Owner-entered tags (custom_amenities, set via /account/manage-listing)
  // are merged in alongside Google's own scraped place_types rather than
  // replacing them — same precedence as app/shop/[slug]/page.tsx.
  const scrapedTags: string[] = salon.place_types
    ? salon.place_types
        .split("|")
        .map((t: string) => t.trim().replace(/_/g, " "))
        .filter((t: string) => !["point of interest", "establishment", "service", "health", "store"].includes(t))
    : [];
  const customTags: string[] = Array.isArray(salon.custom_amenities) ? salon.custom_amenities : [];
  const tagList: string[] = [...customTags, ...scrapedTags.filter((t) => !customTags.some((c) => c.toLowerCase() === t.toLowerCase()))];

  const hours: string[] = Array.isArray(salon.site_config?.hours) ? salon.site_config.hours : [];

  const directionsHref =
    salon.latitude && salon.longitude
      ? `https://www.google.com/maps?q=${salon.latitude},${salon.longitude}`
      : salon.formatted_address
      ? `https://www.google.com/maps?q=${encodeURIComponent(salon.formatted_address)}`
      : null;

  const salonCenter =
    salon.latitude && salon.longitude ? { lat: Number(salon.latitude), lng: Number(salon.longitude) } : null;
  const [nearbyCosmetologists, nearbyStores] = salonCenter
    ? await Promise.all([
        fetchNearbyEntities(supabase, "cosmetologists", salonCenter, { limit: 5 }),
        fetchNearbyEntities(supabase, "beautySupplyStores", salonCenter, { limit: 5 }),
      ])
    : [[], []];

  const websiteHref = salon.website
    ? salon.website.startsWith("http")
      ? salon.website
      : `https://${salon.website}`
    : null;

  // Null for beauty supply stores, which get no booking CTA. Everything else
  // is keyed off google_category — 25 distinct values on this table, so the
  // entity type alone would be far too blunt. See lib/booking-services.ts.
  const bookingServices = servicesForEntity({
    entityType: "salon",
    googleCategory: salon.google_category,
  });

  // Prepare images array, fallback to shop_image_url — same precedence as
  // app/shop/[slug]/page.tsx.
  const images: string[] = salon.google_images && Array.isArray(salon.google_images) && salon.google_images.length > 0
    ? salon.google_images
    : [salon.shop_image_url || "/images/default_shop_image.png"];

  const salonJsonLd = buildSalonJsonLd(salon, websiteHref);

  // FAQPage — same pattern as the shop page, using the same booth-rent
  // fields (mostly NULL for salons today, same forward-compatible story).
  const salonFaqEntries: { q: string; a: string }[] = [];
  if (salon.rent_rate || salon.rent_type) {
    salonFaqEntries.push({
      q: `How much is booth rent at ${salon.shop_name}?`,
      a: `${salon.shop_name} offers ${salon.rent_type || 'booth rent'}${salon.rent_rate ? ` at $${salon.rent_rate} per week` : ' — contact the salon for current pricing'}.`,
    });
  }
  if (salon.booth_count_available != null) {
    salonFaqEntries.push({
      q: `Is ${salon.shop_name} hiring stylists?`,
      a: salon.booth_count_available >= 1
        ? `Yes — ${salon.shop_name} currently has ${salon.booth_count_available} chair${salon.booth_count_available > 1 ? 's' : ''} available for rent.`
        : `${salon.shop_name} does not currently have open chairs listed. Check back or contact the salon directly.`,
    });
  }
  if (salon.rating && salon.total_reviews) {
    salonFaqEntries.push({
      q: `What is the rating for ${salon.shop_name}?`,
      a: `${salon.shop_name} is rated ${Number(salon.rating).toFixed(1)} stars based on ${salon.total_reviews} reviews.`,
    });
  }
  const salonPath = `/salons/${salon.slug}`;
  const salonFaqJsonLd = faqNode(salonPath, salonFaqEntries, entityId(salonPath));
  if (salonFaqJsonLd) salonJsonLd.subjectOf = ref(faqId(salonPath));

  const salonGraph = graphJson(
    webPageNode({
      path: salonPath,
      type: "ProfilePage",
      name: salon.shop_name,
      primaryEntityId: entityId(salonPath),
      breadcrumb: true,
      about: topics("cosmetology", "salon"),
    }),
    buildEntityBreadcrumbJsonLd("Salons", "/salons", salon.shop_name, salon.slug),
    salonJsonLd,
    salonFaqJsonLd,
    regulatorFor(salon.address_state || "TX"),
  );

  // Same-category businesses near this one, for "Good compared to what?".
  // Guarded on coordinates: 5-6% of rows have none, and a comparison
  // anchored nowhere would list businesses at unknown distances.
  const comparables =
    salon.latitude != null && salon.longitude != null
      ? await fetchComparables(supabase, "salon", {
          id: salon.id,
          lat: Number(salon.latitude),
          lng: Number(salon.longitude),
          category: salon.google_category ?? null,
        })
      : [];

  return (
    <div className="min-h-screen light bg-white text-slate-900 selection:bg-blue-500/20 flex flex-col overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: salonGraph }} />

      <Navbar />

      <div className="flex-grow pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto w-full">

        <DynamicBackButton fallbackHref="/tools/barbershop-search?tab=Salons" />


        {/* Header Title & Badges */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div>
            <h1 className="font-black text-3xl md:text-5xl text-slate-900 tracking-tight leading-tight mb-2">
              {salon.shop_name}
            </h1>
            <div className="flex items-center gap-x-4 gap-y-2 text-slate-600 font-medium flex-wrap">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {salon.formatted_address || `${salon.city}, TX`}
              </span>
              {directionsHref && (
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ig-click="outbound_lead"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:underline"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
              )}
              {/* Rating/review count intentionally removed from this header
                  row — a salon with 0 real reviews was still showing a
                  hardcoded "4.8" fallback, an impossible/misleading
                  combination. Rating and review count are still used
                  elsewhere (search results, JSON-LD, etc.), just not here. */}
              {/* school_district_name is computed once from the address a
                  salon had at scrape time — once claimed, the owner can
                  edit that address freely (including to somewhere entirely
                  outside Texas, the only region this platform's school-
                  district data covers), so the stored value can no longer
                  be trusted to match the current address. Only shown for
                  unclaimed salons, where address and district still agree. */}
              {salon.school_district_name && !isClaimed && (
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  Located in {salon.school_district_name}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-0">
            {isClaimed ? (
              <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-6 py-3 rounded-xl font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Claimed
              </span>
            ) : (
              <ClaimShopButton shop={salon} entityType="salon" />
            )}
            {/* Book Appointment replaces the old Call and Website buttons —
                see the note on the same block in app/shop/[slug]/page.tsx.
                The service list is keyed off google_category, which matters
                more here than anywhere: this table holds nail salons, spas,
                med spas and eyelash salons alongside the hair salons. */}
            {bookingServices && (
              <div className="flex gap-2 mt-3 w-full sm:w-auto">
                <BookAppointmentButton
                  entityType="salon"
                  entityId={String(salon.id)}
                  entityName={salon.shop_name}
                  services={bookingServices}
                  fallbackPhone={salon.phone}
                  fallbackWebsite={websiteHref}
                />
              </div>
            )}
          </div>
        </div>

        {/* Real Estate Image Gallery (Masonry on Desktop, Swipe Carousel on Mobile) */}
        <ShopPhotoGallery
          images={images}
          shopName={salon.shop_name}
          badgeLabel={isHiring ? `${salon.booth_count_available || 1} Chairs Available` : "Not Hiring At The Moment"}
          badgeVariant={isHiring ? "available" : "off-market"}
        />

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Left Column (Details) */}
          <div className="lg:col-span-2 space-y-12">

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-10 border-b border-slate-200">
              <div className="flex flex-col">
                <span className="text-slate-500 text-sm font-semibold mb-1">Rent Type</span>
                <span className="text-slate-900 font-bold capitalize flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {salon.rent_type || "Booth Rent"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-sm font-semibold mb-1">Weekly Rate</span>
                <span className="text-slate-900 font-bold">
                  {salon.rent_rate ? `$${salon.rent_rate}` : "Contact for Pricing"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-sm font-semibold mb-1">Availability</span>
                <span className="text-slate-900 font-bold">
                  {salon.booth_count_available ? `${salon.booth_count_available} Chairs` : "Inquire"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-sm font-semibold mb-1">Specialties Needed</span>
                <span className="text-slate-900 font-bold truncate" title={salon.specialty_desired || "General"}>
                  {salon.specialty_desired || "General"}
                </span>
              </div>
            </div>

            {/* Description / Vibe */}
            <div className="pb-10 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900 mb-6">About this salon</h2>
              {salon.ai_culture_summary ? (
                // The owner's own words (set via /account/manage-listing's
                // "About Your Shop" field) are the source of truth once
                // present — same precedence as app/shop/[slug]/page.tsx.
                <p className="text-slate-600 text-lg leading-relaxed mb-6 whitespace-pre-line">
                  {salon.ai_culture_summary}
                </p>
              ) : isHiring ? (
                <p className="text-slate-600 text-lg leading-relaxed mb-6">
                  Welcome to {salon.shop_name}, a premier styling destination located in the heart of {salon.city}. We are currently seeking professional, driven stylists to join our growing team.
                  {/* See app/shop/[slug]/page.tsx — raw interpolation rendered "across  reviews"
                      whenever the scraper captured a rating but no count. */}
                  With high foot traffic
                  {salon.rating
                    ? salon.total_reviews
                      ? `, excellent local ratings (${Number(salon.rating).toFixed(1)} stars across ${salon.total_reviews} reviews),`
                      : `, excellent local ratings (${Number(salon.rating).toFixed(1)} stars on Google),`
                    : ''}{' '}
                  and a modern atmosphere, this is the perfect location to build and scale your clientele.
                </p>
              ) : (
                <p className="text-slate-600 text-lg leading-relaxed mb-6">
                  {salon.shop_name} is a hair & beauty salon located in {salon.city}, TX
                  {/* See app/stores/[slug]/page.tsx — a real subset of scraper-sourced rows
                      has a rating but no captured review count, and `|| 0` rendered
                      "across 0 reviews". Drop the count clause instead of asserting zero. */}
                  {salon.rating
                    ? salon.total_reviews
                      ? `, rated ${Number(salon.rating).toFixed(1)} stars across ${salon.total_reviews} reviews`
                      : `, rated ${Number(salon.rating).toFixed(1)} stars on Google`
                    : ''}.
                  This salon isn't currently listed as hiring — request a Shop Day or contact the owner directly to ask about chair availability.
                </p>
              )}

              {/* Sponsored ad spot — demo placement promoting a real DB salon
                  (Expert Hair Salon); click opens an advertising inquiry email. */}
              {/* The comparison strip and the shortlist button — see
                  components/shortlist/compare-nearby.tsx for why this is the one
                  thing a directory can do that the business's own listing cannot. */}
              <div className="mb-4 space-y-4">
                <AddToShortlist entityType="salon" slug={salon.slug} name={salon.shop_name} />
                <CompareNearby rows={comparables} originName={salon.shop_name} originRating={salon.rating != null ? Number(salon.rating) : null} />
                <ServiceIntent entityType="salon" entitySlug={salon.slug} city={salon.city} />
                <OwnerGbpStrip isClaimed={isClaimed} businessName={salon.shop_name} />
              </div>
              <SalonSponsoredAd currentSlug={salon.slug} city={salon.city} address={salon.formatted_address} />

              {isHiring && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex gap-4">
                  <Info className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-blue-900 mb-1">Why work here?</h4>
                    <p className="text-blue-800/80 text-sm">We provide an inclusive, professional environment that empowers stylists to maximize their earning potential. Located in a high-visibility area, this salon is ideal for walk-ins and organic growth.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Amenities & Tags */}
            <div className="pb-10 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Amenities & Tags</h2>
              <div className="flex flex-wrap gap-3">
                {tagList.map((tag: string, idx: number) => (
                  <span key={idx} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold capitalize flex items-center gap-2 border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    {tag}
                  </span>
                ))}
                {tagList.length === 0 && (
                  <span className="text-slate-500 italic">No specific tags provided.</span>
                )}
              </div>
            </div>

            <ReviewsSection
              reviews={reviews}
              averageRating={averageRating}
              entityName={salon.shop_name}
              action={<WriteReviewButton entityType="salon" entityId={salon.id} entityName={salon.shop_name} />}
            />

            {/* Google reviews for an owner who connected their Business Profile.
                Fetched live (never stored — Google's terms restrict caching
                review content) and renders nothing when there's no connection. */}
            <GooglePosts entityType="salon" entityId={salon.id} />
            <GoogleReviews entityType="salon" entityId={salon.id} />

            {/* Your Market Ecosystem — salon/cosmetology side of the market only */}
            {ecosystemReport && (() => {
              const { talentPipeline, laborMarket, competition, supplyChain, rentBenchmark, radii } = ecosystemReport;
              const marketLabel = laborMarket.ratio == null
                ? { label: "Not Enough Data", tone: "slate" as const }
                : laborMarket.ratio >= 2
                ? { label: "Talent-Rich — Easy to Hire", tone: "green" as const }
                : laborMarket.ratio >= 0.5
                ? { label: "Balanced Market", tone: "amber" as const }
                : { label: "Competitive for Talent", tone: "red" as const };
              const toneClasses: Record<string, string> = {
                green: "bg-green-50 text-green-700 border-green-200",
                amber: "bg-amber-50 text-amber-700 border-amber-200",
                red: "bg-red-50 text-red-700 border-red-200",
                slate: "bg-slate-50 text-slate-600 border-slate-200",
              };
              const scoreTone = (score: number) => score >= 85 ? "text-green-600" : score >= 70 ? "text-amber-600" : "text-red-600";
              const gathering = <span className="text-sm text-slate-400 italic">Still gathering data, check back later.</span>;

              return (
                <div className="pb-10 border-b border-slate-200">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                    <h2 className="text-2xl font-black text-slate-900">Your Market Ecosystem</h2>
                    <Link
                      href={`/tools/barbershop-search?ecosystemShopId=${salon.id}&ecosystemShopName=${encodeURIComponent(salon.shop_name)}`}
                      data-ig-click="ask_ai_market"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Ask AI About This Market
                    </Link>
                  </div>
                  <p className="text-slate-500 text-sm mb-6 -mt-3">
                    The salon side of this business&apos;s local market — cosmetology schools, cosmetologists seeking placement, competing salons, and beauty supply stores nearby.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Talent Pipeline — cosmetology schools within 15mi */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <GraduationCap className="w-4 h-4" />
                        Talent Pipeline
                      </div>
                      {talentPipeline.schoolCount > 0 ? (
                        <>
                          <p className="text-sm text-slate-600 mb-3">
                            <span className="font-black text-slate-900 text-lg">{talentPipeline.schoolCount}</span> cosmetology school{talentPipeline.schoolCount === 1 ? "" : "s"} within {radii.talent} mi
                            {(talentPipeline.avgWrittenPassRate != null || talentPipeline.avgPracticalPassRate != null) && (
                              <> · avg 2026 pass rate
                                {talentPipeline.avgWrittenPassRate != null && <> written <span className="font-bold text-slate-900">{talentPipeline.avgWrittenPassRate}%</span></>}
                                {talentPipeline.avgWrittenPassRate != null && talentPipeline.avgPracticalPassRate != null && ","}
                                {talentPipeline.avgPracticalPassRate != null && <> practical <span className="font-bold text-slate-900">{talentPipeline.avgPracticalPassRate}%</span></>}
                              </>
                            )}
                          </p>
                          {talentPipeline.topSchools.length > 0 && (
                            <div className="space-y-1.5">
                              {talentPipeline.topSchools.map((s) => (
                                <Link
                                  key={s.name}
                                  href={s.profileUrl}
                                  className="flex items-center justify-between text-xs hover:bg-slate-100 -mx-1 px-1 py-0.5 rounded transition-colors"
                                >
                                  <span className="text-slate-700 font-semibold truncate pr-2 hover:text-primary hover:underline">{s.name}</span>
                                  <span className={`font-black shrink-0 ${scoreTone(s.score)}`}>{Math.round(s.score)} · {s.distanceMiles.toFixed(1)}mi</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </>
                      ) : gathering}
                    </div>

                    {/* Labor Market — cosmetologists seeking placement within 15mi */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <Users className="w-4 h-4" />
                        Labor Market
                      </div>
                      {laborMarket.seekingPlacement > 0 ? (
                        <>
                          <p className="text-sm text-slate-600 mb-3">
                            <span className="font-black text-slate-900 text-lg">{laborMarket.seekingPlacement}</span> cosmetologist{laborMarket.seekingPlacement === 1 ? "" : "s"} seeking placement within {radii.labor} mi
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${toneClasses[marketLabel.tone]}`}>
                            {marketLabel.label}
                          </span>
                        </>
                      ) : gathering}
                    </div>

                    {/* Competitive Landscape — other salons within 10mi */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <Scissors className="w-4 h-4" />
                        Competitive Landscape
                      </div>
                      {competition.competitorCount > 0 ? (
                        <p className="text-sm text-slate-600">
                          <span className="font-black text-slate-900 text-lg">{competition.competitorCount}</span> competing salon{competition.competitorCount === 1 ? "" : "s"} within {radii.competition} mi
                          {' '}(<span className="font-bold text-green-600">{competition.competitorsHiring} hiring</span>)
                        </p>
                      ) : gathering}
                    </div>

                    {/* Supply Chain — beauty supply stores within 15mi */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <ShoppingBag className="w-4 h-4" />
                        Supply Chain
                      </div>
                      {supplyChain.supplyStoreCount > 0 ? (
                        <p className="text-sm text-slate-600">
                          <span className="font-black text-slate-900 text-lg">{supplyChain.supplyStoreCount}</span> beauty supply store{supplyChain.supplyStoreCount === 1 ? "" : "s"} within {radii.supply} mi
                          {supplyChain.nearestSupplyStoreName && supplyChain.nearestSupplyStoreMiles != null && (
                            <> · nearest is <span className="font-semibold text-slate-800">{supplyChain.nearestSupplyStoreName}</span> ({supplyChain.nearestSupplyStoreMiles.toFixed(1)}mi)</>
                          )}
                        </p>
                      ) : gathering}
                    </div>

                    {/* Rent Benchmark — booth rent across salons within 15mi */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 md:col-span-2">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <Award className="w-4 h-4" />
                        Rent Benchmark
                      </div>
                      {rentBenchmark.localMedianWeeklyRent != null ? (
                        <p className="text-sm text-slate-600">
                          Median weekly booth rent across <span className="font-black text-slate-900">{rentBenchmark.venueCount}</span> salon{rentBenchmark.venueCount === 1 ? "" : "s"} within {radii.rent} mi ({rentBenchmark.sampleSize} with listed rent): <span className="font-black text-slate-900">${rentBenchmark.localMedianWeeklyRent}</span>
                          {rentBenchmark.thisWeeklyRent != null && rentBenchmark.percentDiff != null ? (
                            <>
                              {' '}— this salon is <span className={`font-bold inline-flex items-center gap-0.5 ${rentBenchmark.percentDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {rentBenchmark.percentDiff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {Math.abs(Math.round(rentBenchmark.percentDiff))}% {rentBenchmark.percentDiff > 0 ? 'above' : 'below'}
                              </span> the local median.
                            </>
                          ) : (
                            " — this salon's own rent couldn't be parsed from its listing for comparison."
                          )}
                        </p>
                      ) : gathering}
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Right Column (Sticky Sidebar) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="sticky top-32 bg-white border border-slate-200 rounded-[2rem] shadow-2xl p-8">

              <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-2xl text-slate-900 mb-1">
                    {salon.rent_rate ? `$${salon.rent_rate}` : "Pricing"}
                  </h3>
                  <p className="text-slate-500 font-semibold">{salon.rent_rate ? "per week" : "Contact Owner"}</p>
                </div>
                <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${isHiring ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {isHiring ? "Available" : "Not Hiring At The Moment"}
                </div>
              </div>

              {/* Owner Box */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-5">
                  <ShieldCheck className="w-24 h-24" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Managed By</p>
                <h4 className="font-black text-slate-900 text-lg mb-4">{salon.owner_name && salon.owner_name !== "Unknown Owner" ? salon.owner_name : "Unclaimed (Claim to add)"}</h4>

                {/* Call/Website moved up to the page header (old Write A
                    Review slot); Email stays here as the owner-direct channel. */}
                {salon.email && (
                  <div className="grid gap-3 mt-4 relative z-10 grid-cols-1">
                    <a href={`mailto:${salon.email}`} data-ig-click="outbound_lead" className="w-full py-3 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      Email
                    </a>
                  </div>
                )}
              </div>

              <SearchVisibilityCard searchPerformance={searchPerformance} isClaimed={isClaimed} entityLabel="salon" />

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Lock className="w-3 h-3" />
                Secure contact via Barber & Beauty Network
              </div>
            </div>

            {/* Location/Get Directions now live at the top next to the
                address (moved up) — this sidebar Location card was redundant
                with that, so it was removed. */}
            <NearbyEntitiesSection title="Nearby Cosmetologists" icon={Users} entities={nearbyCosmetologists} />
            <NearbyEntitiesSection title="Nearby Beauty Supply Stores" icon={Store} entities={nearbyStores} />

            {hours.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Business Hours
                </h3>
                <ul className="space-y-1.5">
                  {hours.map((h, i) => {
                    const [day, ...rest] = h.split(":");
                    return (
                      <li
                        key={h}
                        className={`flex items-start justify-between gap-3 text-xs font-medium ${
                          i === TODAY_INDEX ? "text-slate-900 font-bold" : "text-slate-500"
                        }`}
                      >
                        <span>{day}</span>
                        <span className="text-right">{rest.join(":").trim() || "Closed"}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <BackToSearchLink
            fallbackHref="/tools/barbershop-search?tab=Salons"
            className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
