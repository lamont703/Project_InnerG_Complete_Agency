import { createClient } from "@supabase/supabase-js";
import { Metadata, ResolvingMetadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { MapPin, Scissors, CheckCircle2, ShieldCheck, Lock, Award, Users, ChevronLeft, Map as MapIcon, Mail, Phone, Info, GraduationCap, TrendingUp, TrendingDown, ShoppingBag, Sparkles, Landmark, Globe, Navigation, Clock, Store } from "lucide-react";
import { computeShopEcosystemReport } from "@/lib/shop-ecosystem";
import Image from "next/image";
import { ShopPhotoGallery } from "@/components/shared/shop-photo-gallery";
import { buildEntityBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { ClaimShopButton } from "@/components/shared/claim-shop-button";
import { WriteReviewButton } from "@/components/shared/write-review-button";
import { ReviewsSection } from "@/components/shared/reviews-section";
import { GoogleReviews } from "@/components/shared/google-reviews";
import { GooglePosts } from "@/components/shared/google-posts";
import { NearbyEntitiesSection } from "@/components/shared/nearby-entities-section";
import { ShopSponsoredAd } from "@/components/ads/ShopSponsoredAd";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { Navbar } from "@/components/layout/navbar";
import { SearchVisibilityCard } from "@/components/shared/search-visibility-card";
import { getApprovedReviews, computeReviewStats } from "@/lib/reviews";
import { fetchNearbyEntities } from "@/lib/nearby-entities";
import { composeDescription, ratingClause, streetClause } from "@/lib/seo-description";
import { SITE_URL } from "@/lib/site";
import { AddToShortlist } from "@/components/shortlist/add-to-shortlist";
import { OwnerGbpStrip } from "@/components/shortlist/owner-gbp-strip";
import { CompareNearby } from "@/components/shortlist/compare-nearby";
import { ServiceIntent } from "@/components/shortlist/service-intent";
import { fetchComparables } from "@/lib/shortlist";
import { cleanBusinessName, entityTitle } from "@/lib/entity-title";
import {
  WIKIDATA, cityNode, entityId, faqId, faqNode, graphJson, identifiers,
  pageId, ref, regulatorFor, topics, webPageNode,
} from "@/lib/schema-graph";

/**
 * Cached and regenerated hourly, matching /salons/[slug] and /schools/[slug].
 *
 * This was force-dynamic — every one of ~2,500 shop pages recomputed on every
 * request, including the ecosystem report and the nearby-entity lookup. Our own
 * field data put /shop at an LCP p75 of 3.14s against 2.60s for salons and
 * 2.58s for schools, which are the same shape of page on the same data and
 * differ only in this line.
 *
 * Nothing about the URL changes. Staleness is bounded by revalidatePath() in
 * the claim flow (app/api/community/register/route.ts), so a newly claimed shop
 * shows its badge immediately rather than waiting out the hour.
 */
export const revalidate = 3600;

type Props = {
  params: { slug: string }
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Node's fetch (undici) occasionally throws a bare "TypeError: fetch
// failed" on a one-off connection blip — unrelated to the request itself,
// and gone on the very next attempt. A couple of quick retries turns that
// into an invisible hiccup instead of a 500 page.
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) await sleep(300 * (attempt + 1));
    }
  }
  throw lastError;
}

// Create a standard client for public SSR fetches
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
  {
    global: {
      fetch: (url, options) => {
        return fetchWithRetry(url as string, { ...options, cache: 'no-store' });
      }
    }
  }
);

const TODAY_INDEX = (new Date().getDay() + 6) % 7; // 0 = Monday, matches Google's weekdayDescriptions order

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;

  /**
   * SIX OF THE TWELVE FIELDS THIS FUNCTION USES WERE NEVER SELECTED.
   *
   * The list was `shop_name,city,shop_image_url,hiring_need,booth_count_available,nearby_areas`
   * while the description builder below reads rating, total_reviews,
   * formatted_address, address_state, rent_type and rent_rate. All six came
   * back undefined, so `ratingClause(shop.rating, shop.total_reviews)` and
   * `streetClause(...)` returned null on EVERY barbershop page — silently,
   * because both helpers are written to drop a clause rather than throw when
   * their inputs are missing.
   *
   * That is why /shop descriptions read "See photos, hours and contact details"
   * with no rating, while /salons — which selects through SALON_PUBLIC_COLUMNS
   * and therefore has the data — reads "Rated 4.8★ from 1,120 Google reviews".
   * Two page types, the same builder, opposite output, for a reason invisible
   * at the call site.
   *
   * A missing column here degrades quietly. If you add a field to the metadata
   * below, add it here in the same edit.
   */
  const metaSelect = [
    "shop_name", "city", "shop_image_url", "hiring_need", "booth_count_available",
    "nearby_areas", "rating", "total_reviews", "formatted_address", "address_state",
    "rent_type", "rent_rate",
  ].join(",");
  const slugUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/agent_barbershop_leads?slug=eq.${resolvedParams.slug}&select=${metaSelect}`;
  const slugResponse = await fetchWithRetry(slugUrl, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
    },
    cache: 'no-store'
  });
  const slugData = await slugResponse.json();
  let shop = slugData && slugData.length > 0 ? slugData[0] : null;

  if (!shop && UUID_RE.test(resolvedParams.slug)) {
    const idUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/agent_barbershop_leads?id=eq.${resolvedParams.slug}&select=${metaSelect}`;
    const idResponse = await fetchWithRetry(idUrl, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
      },
      cache: 'no-store'
    });
    const idData = await idResponse.json();
    shop = idData && idData.length > 0 ? idData[0] : null;
  }

  if (!shop) {
    return {
      title: "Shop Not Found | Shop Day Network",
    };
  }

  // "is Hiring" used to be hardcoded into every shop's title regardless of
  // real availability — 1,002 of 1,054 shops (95%) have zero open chairs,
  // so nearly every page asserted a false, near-duplicate claim. That's
  // exactly the kind of low-quality-title signal that suppresses Google
  // indexing (confirmed: /shop/ had the worst indexation rate of any
  // entity category). Title now matches the same hiring condition already
  // used correctly by the photo gallery badge below.
  const isHiring = !!(shop.hiring_need || (shop.booth_count_available && shop.booth_count_available >= 1));
  // "Profile" was directory filler and the title never said "reviews" — see
  // lib/entity-title.ts for the Search Console numbers behind this shape.
  const title = entityTitle({
    name: shop.shop_name,
    city: shop.city,
    rating: shop.rating,
    reviewCount: shop.total_reviews,
    kind: "Barbershop",
    isHiring,
    hiringTitle: `${cleanBusinessName(shop.shop_name)} is Hiring on Shop Day Network`,
  });
  const nearbyAreas: string[] = Array.isArray(shop.nearby_areas) ? shop.nearby_areas : [];

  // The non-hiring branch used to discard everything gathered here and rebuild
  // a short string from name/city/rating alone, which is why these pages came
  // out around 90 characters and Bing flagged them. Both branches now draw from
  // the same clause list, ordered so the most differentiating fact leads.
  const description = composeDescription([
    `${shop.shop_name} — barbershop in ${shop.city}${shop.address_state ? `, ${shop.address_state}` : ", TX"}`,
    shop.booth_count_available
      ? `${shop.booth_count_available} chair${shop.booth_count_available > 1 ? "s" : ""} available${shop.rent_type ? ` (${shop.rent_type}${shop.rent_rate ? ` at $${shop.rent_rate}/week` : ""})` : ""}`
      : isHiring
      ? "Now hiring"
      : null,
    ratingClause(shop.rating, shop.total_reviews),
    // Concrete and unique to this record — what a sparse listing falls back on
    // instead of a generic "view photos" tail.
    streetClause(shop.formatted_address, shop.city),
    nearbyAreas.length > 0 ? `Also serving ${nearbyAreas.join(", ")}` : null,
    isHiring ? "See photos and request a Shop Day" : "See photos, hours and contact details",
  ]);
  const image = shop.shop_image_url || "/shop_day_card.jpg";

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/shop/${resolvedParams.slug}` },
    openGraph: {
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ShopProfilePage({ params }: Props) {
  const resolvedParams = await params;

  // Use native fetch to bypass any Supabase client caching bugs in Next.js 15+
  const slugUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/agent_barbershop_leads?slug=eq.${resolvedParams.slug}&select=*`;
  const slugResponse = await fetchWithRetry(slugUrl, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
    },
    cache: 'no-store'
  });
  const slugData = await slugResponse.json();
  let shop = slugData && Array.isArray(slugData) && slugData.length > 0 ? slugData[0] : null;

  // Legacy /shop/{uuid} links: fall back to an id lookup, then 308-redirect
  // to the canonical slug URL so old links consolidate instead of dual-serving.
  if ((!shop || Object.keys(shop).length === 0) && UUID_RE.test(resolvedParams.slug)) {
    const idUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/agent_barbershop_leads?id=eq.${resolvedParams.slug}&select=*`;
    const idResponse = await fetchWithRetry(idUrl, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
      },
      cache: 'no-store'
    });
    const idData = await idResponse.json();
    shop = idData && Array.isArray(idData) && idData.length > 0 ? idData[0] : null;
    if (shop && Object.keys(shop).length > 0) {
      permanentRedirect(`/shop/${shop.slug}`);
    }
  }

  if (!shop || Object.keys(shop).length === 0) {
    notFound();
  }

  const ecosystemReport = await computeShopEcosystemReport(supabase, shop, "shop");
  const reviews = await getApprovedReviews("shop", shop.id);
  const { averageRating } = computeReviewStats(reviews);

  // Location/Directions, Nearby Cosmetologists, Nearby Beauty Supply
  // Stores, and Business Hours — same logic and card layout as
  // app/salons/[slug]/page.tsx, ported over so shop pages show the same
  // sections salon pages already did.
  const hours: string[] = Array.isArray(shop.site_config?.hours) ? shop.site_config.hours : [];
  const directionsHref = shop.latitude && shop.longitude
    ? `https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`
    : shop.formatted_address
    ? `https://www.google.com/maps?q=${encodeURIComponent(shop.formatted_address)}`
    : null;
  const shopCenter = shop.latitude && shop.longitude ? { lat: Number(shop.latitude), lng: Number(shop.longitude) } : null;
  const [nearbyCosmetologists, nearbyStores] = shopCenter
    ? await Promise.all([
        fetchNearbyEntities(supabase, "cosmetologists", shopCenter, { limit: 5 }),
        fetchNearbyEntities(supabase, "beautySupplyStores", shopCenter, { limit: 5 }),
      ])
    : [[], []];

  // Rolling 30-day window for a "found this month" framing that stays
  // meaningful going forward rather than an all-time count that only ever
  // grows. Analytics only — does not affect trust_score (that reads
  // claimed_at directly in search_barbershops_ranked).
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: searchPerfRows } = await supabase.rpc('get_search_performance_by_entity', {
    p_entity_id: shop.id,
    p_result_type: 'shop',
    p_cutoff: thirtyDaysAgo,
  });
  const searchPerformance = (searchPerfRows && searchPerfRows[0]) || null;
  const isClaimed = !!shop.claimed_at;
  // Same condition the photo gallery badge below already uses correctly —
  // reused here so the title, body copy, and sidebar badge all agree with
  // each other instead of every shop unconditionally claiming to be hiring.
  const isHiring = !!(shop.hiring_need || (shop.booth_count_available && shop.booth_count_available >= 1));

  // Owner-entered tags (custom_amenities, set via /account/manage-listing)
  // are merged in alongside Google's own scraped place_types rather than
  // replacing them — the owner is adding real detail Google's categories
  // don't capture (e.g. "Kids Cuts", "Wheelchair Accessible"), not
  // correcting what's already there.
  const scrapedTags = shop.place_types
    ? shop.place_types.split('|').map((t: string) => t.trim().replace('_', ' ')).filter((t: string) => t !== 'point of interest' && t !== 'establishment' && t !== 'service' && t !== 'health')
    : [];
  const customTags: string[] = Array.isArray(shop.custom_amenities) ? shop.custom_amenities : [];
  const tagList = [...customTags, ...scrapedTags.filter((t: string) => !customTags.some((c) => c.toLowerCase() === t.toLowerCase()))];

  // Same precedence as app/salons/[slug]/page.tsx's websiteHref.
  const websiteHref = shop.website
    ? shop.website.startsWith("http") ? shop.website : `https://${shop.website}`
    : null;

  const maskEmail = (email: string) => email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';
  const maskPhone = (phone: string) => phone ? phone.replace(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/, '(***) ***-****') : '';

  // Prepare images array, fallback to shop_image_url
  const images = shop.google_images && Array.isArray(shop.google_images) && shop.google_images.length > 0
    ? shop.google_images
    : [shop.shop_image_url || "/images/default_shop_image.png"];

  /**
   * The knowledge-graph node for this barbershop.
   *
   * `@id` is the important addition. Without it this was an anonymous
   * LocalBusiness that nothing could reference — not the FAQ that answers
   * questions about it, not the page that profiles it, not a city listing that
   * includes it. Minted from the canonical path, so it is unique by
   * construction and survives a domain move.
   *
   * `additionalType` carries the Wikidata concept for a barbershop. schema.org
   * has HairSalon and BeautySalon but no BarberShop, and typing a barbershop as
   * a HairSalon would be a small lie repeated across thousands of pages —
   * LocalBusiness plus the external concept says the true thing.
   */
  const shopPath = `/shop/${shop.slug}`;
  const shopNodeId = entityId(shopPath);
  const shopCity = shop.address_city || shop.city || null;
  const shopState = shop.address_state || "TX";

  const shopJsonLd: Record<string, any> = {
    "@type": "LocalBusiness",
    "@id": shopNodeId,
    additionalType: WIKIDATA.barbershop,
    name: shop.shop_name,
    mainEntityOfPage: ref(pageId(shopPath)),
  };
  // Claimed shops have real structured address fields (see the
  // 20260721000000 migration) — a properly split PostalAddress is
  // schema.org's own recommended shape, versus dumping the whole string
  // into streetAddress for shops that haven't been through the claim form.
  if (shop.street_address && shop.address_city) {
    shopJsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: shop.street_address,
      addressLocality: shop.address_city,
      addressRegion: shop.address_state || "TX",
      postalCode: shop.address_zip || undefined,
      addressCountry: "US",
    };
  } else if (shop.formatted_address) {
    shopJsonLd.address = { "@type": "PostalAddress", streetAddress: shop.formatted_address, addressRegion: "TX", addressCountry: "US" };
  }
  if (shop.latitude && shop.longitude) shopJsonLd.geo = { "@type": "GeoCoordinates", latitude: shop.latitude, longitude: shop.longitude };
  if (shop.phone) shopJsonLd.telephone = shop.phone;
  if (websiteHref) shopJsonLd.url = websiteHref;
  if (shop.rating && shop.total_reviews) {
    shopJsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(shop.rating),
      reviewCount: Number(shop.total_reviews),
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (images[0]) shopJsonLd.image = images[0];
  // Real, computed proximity (lib/nearby-areas.ts), not a claimed service
  // area — see app/salons/[slug]/page.tsx for the reasoning.
  //
  // Typed as Place nodes rather than left as bare strings. "Spring Branch" as a
  // string is a token a consumer has to guess at; as a Place it is somewhere.
  // Place rather than City deliberately: several of these are neighbourhoods,
  // and calling a neighbourhood a city would be wrong in a way nothing catches.
  if (Array.isArray(shop.nearby_areas) && shop.nearby_areas.length > 0) {
    shopJsonLd.areaServed = shop.nearby_areas.map((a: string) => ({ "@type": "Place", name: a }));
  }

  /* The edges. Each one is a fact we already hold and previously threw away at
     the markup boundary. */

  // Where it sits, joined up to the state and (where verified) to Wikidata, so
  // this shop and the Houston city page agree on what Houston is.
  const shopPlace = cityNode(shopCity, shopState);
  if (shopPlace) shopJsonLd.containedInPlace = shopPlace;

  // The Google Place ID is the one identifier that survives a rename or a move,
  // which is exactly what makes it worth publishing for reconciliation.
  const shopIds = identifiers({ googlePlaceId: shop.place_id });
  if (shopIds) shopJsonLd.identifier = shopIds;

  // Booth rent is a real offer this business makes, and it is the single most
  // asked question on these pages. It was previously stated only in prose.
  //
  // `rent_type` is NOT reliably null when unknown — a large share of rows carry
  // the literal string "Unknown", which produced `"Unknown chair rental"` in the
  // first version of this markup. A placeholder that reads as a real value is
  // the failure mode a null check does not catch, so the string is filtered by
  // value, not by presence.
  const rentType = typeof shop.rent_type === "string"
    && !/^(unknown|n\/?a|none|tbd)$/i.test(shop.rent_type.trim())
    ? shop.rent_type.trim()
    : null;
  if (shop.rent_rate || shop.booth_count_available != null) {
    const offer: Record<string, any> = {
      "@type": "Offer",
      name: rentType ? `${rentType} chair rental` : "Barber chair rental",
      category: "Booth rental",
      availability: shop.booth_count_available && shop.booth_count_available > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: ref(shopNodeId),
    };
    if (shop.rent_rate) {
      offer.priceSpecification = {
        "@type": "UnitPriceSpecification",
        price: Number(shop.rent_rate),
        priceCurrency: "USD",
        unitCode: "WEE", // UN/CEFACT code for week — booth rent here is weekly.
      };
    }
    shopJsonLd.makesOffer = offer;
  }

  // Subject scope, as resolvable concepts rather than keyword strings.
  shopJsonLd.knowsAbout = topics("barbering");

  const shopRegulator = regulatorFor(shopState);

  // FAQPage — answers the exact questions searchers ask at this decision point.
  const shopFaqEntries: { q: string; a: string }[] = [];
  if (shop.rent_rate || shop.rent_type) {
    shopFaqEntries.push({
      q: `How much is booth rent at ${shop.shop_name}?`,
      a: `${shop.shop_name} offers ${shop.rent_type || 'booth rent'}${shop.rent_rate ? ` at $${shop.rent_rate} per week` : ' — contact the shop for current pricing'}.`,
    });
  }
  if (shop.booth_count_available != null) {
    shopFaqEntries.push({
      q: `Is ${shop.shop_name} hiring barbers?`,
      a: shop.booth_count_available >= 1
        ? `Yes — ${shop.shop_name} currently has ${shop.booth_count_available} chair${shop.booth_count_available > 1 ? 's' : ''} available for rent.`
        : `${shop.shop_name} does not currently have open chairs listed. Check back or contact the shop directly.`,
    });
  }
  if (shop.rating && shop.total_reviews) {
    shopFaqEntries.push({
      q: `What is the rating for ${shop.shop_name}?`,
      a: `${shop.shop_name} is rated ${shop.rating} stars based on ${shop.total_reviews} reviews.`,
    });
  }
  const shopFaqJsonLd = faqNode(shopPath, shopFaqEntries, shopNodeId);
  if (shopFaqJsonLd) shopJsonLd.subjectOf = ref(faqId(shopPath));

  /**
   * ONE graph instead of three documents.
   *
   * These were three sibling <script> tags: a LocalBusiness, an FAQPage and a
   * BreadcrumbList, none of which mentioned the others. A parser got three
   * unrelated facts. Now the ProfilePage says it is about the shop, the shop
   * says the FAQ is about it, the breadcrumb belongs to the page, and all three
   * hang off the WebSite and Organization declared in the root layout.
   */
  const shopGraph = graphJson(
    webPageNode({
      path: shopPath,
      type: "ProfilePage",
      name: shop.shop_name,
      primaryEntityId: shopNodeId,
      breadcrumb: true,
      about: topics("barbering", "barbershop"),
    }),
    buildEntityBreadcrumbJsonLd("Barbershops", "/shop", shop.shop_name, shop.slug),
    shopJsonLd,
    shopFaqJsonLd,
    // Named so the licensing authority behind this shop's state is part of the
    // page's graph rather than something a reader has to already know.
    shopRegulator,
  );

  // Same-category businesses near this one, for "Good compared to what?".
  // Guarded on coordinates: 5-6% of rows have none, and a comparison
  // anchored nowhere would list businesses at unknown distances.
  const comparables =
    shop.latitude != null && shop.longitude != null
      ? await fetchComparables(supabase, "shop", {
          id: shop.id,
          lat: Number(shop.latitude),
          lng: Number(shop.longitude),
          category: shop.google_category ?? null,
        })
      : [];

  return (
    <div className="min-h-screen light bg-white text-slate-900 selection:bg-blue-500/20 flex flex-col overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: shopGraph }} />

      <Navbar />

      <div className="flex-grow pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto w-full">

        <DynamicBackButton fallbackHref="/tools/barbershop-search" />


        {/* Header Title & Badges */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div>
            <h1 className="font-black text-3xl md:text-5xl text-slate-900 tracking-tight leading-tight mb-2">
              {shop.shop_name}
            </h1>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {shop.formatted_address || `${shop.city}, TX`}
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
                  row — a shop with 0 real reviews was still showing a
                  hardcoded "4.8" fallback, an impossible/misleading
                  combination. Rating and review count are still used
                  elsewhere (search results, JSON-LD, etc.), just not here. */}
              {/* school_district_name is computed once from the address a
                  shop had at scrape time — once claimed, the owner can
                  edit that address freely (including to somewhere entirely
                  outside Texas, the only region this platform's school-
                  district data covers), so the stored value can no longer
                  be trusted to match the current address. Only shown for
                  unclaimed shops, where address and district still agree. */}
              {shop.school_district_name && !isClaimed && (
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  Located in {shop.school_district_name}
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
              <ClaimShopButton shop={shop} />
            )}
            {(shop.phone || websiteHref) && (
              <div className="flex gap-2 mt-3 w-full sm:w-auto">
                {shop.phone && (
                  <a href={`tel:${shop.phone}`} data-ig-click="outbound_lead" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm px-6 py-3">
                    <Phone className="w-4 h-4 text-slate-500" />
                    Call
                  </a>
                )}
                {websiteHref && (
                  <a href={websiteHref} target="_blank" rel="noopener noreferrer" data-ig-click="outbound_lead" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm px-6 py-3">
                    <Globe className="w-4 h-4 text-slate-500" />
                    Website
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Real Estate Image Gallery (Masonry on Desktop, Swipe Carousel on Mobile) */}
        <ShopPhotoGallery
          images={images}
          shopName={shop.shop_name}
          badgeLabel={
            shop.hiring_need || (shop.booth_count_available && shop.booth_count_available >= 1)
              ? `${shop.booth_count_available || 1} Chairs Available`
              : "Not Hiring At The Moment"
          }
          badgeVariant={shop.hiring_need || (shop.booth_count_available && shop.booth_count_available >= 1) ? "available" : "off-market"}
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
                  {shop.rent_type || "Booth Rent"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-sm font-semibold mb-1">Weekly Rate</span>
                <span className="text-slate-900 font-bold">
                  {shop.rent_rate ? `$${shop.rent_rate}` : "Contact for Pricing"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-sm font-semibold mb-1">Availability</span>
                <span className="text-slate-900 font-bold">
                  {shop.booth_count_available ? `${shop.booth_count_available} Chairs` : "Inquire"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500 text-sm font-semibold mb-1">Specialties Needed</span>
                <span className="text-slate-900 font-bold truncate" title={shop.specialty_desired || "General"}>
                  {shop.specialty_desired || "General"}
                </span>
              </div>
            </div>

            {/* Description / Vibe */}
            <div className="pb-10 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900 mb-6">About this shop</h2>
              {shop.ai_culture_summary ? (
                // The owner's own words (set via /account/manage-listing's
                // "About Your Shop" field) are the source of truth once
                // present — real, owner-authored content always outranks
                // the generic templated copy below.
                <p className="text-slate-600 text-lg leading-relaxed mb-6 whitespace-pre-line">
                  {shop.ai_culture_summary}
                </p>
              ) : isHiring ? (
                <p className="text-slate-600 text-lg leading-relaxed mb-6">
                  Welcome to {shop.shop_name}, a premier grooming destination located in the heart of {shop.city}. We are currently seeking professional, driven individuals to join our growing team.
                  {/* Raw interpolation rendered "across  reviews" (empty gap) whenever the
                      scraper captured a rating but no count, and the whole parenthetical
                      was nonsense with no rating at all. Both parts are now conditional. */}
                  With high foot traffic
                  {shop.rating
                    ? shop.total_reviews
                      ? `, excellent local ratings (${shop.rating} stars across ${shop.total_reviews} reviews),`
                      : `, excellent local ratings (${shop.rating} stars on Google),`
                    : ''}{' '}
                  and a modern atmosphere, this is the perfect location to build and scale your clientele.
                </p>
              ) : (
                <p className="text-slate-600 text-lg leading-relaxed mb-6">
                  {shop.shop_name} is a grooming destination located in {shop.city}, TX
                  {/* See app/stores/[slug]/page.tsx — a real subset of scraper-sourced rows
                      has a rating but no captured review count, and `|| 0` rendered
                      "across 0 reviews". Drop the count clause instead of asserting zero. */}
                  {shop.rating
                    ? shop.total_reviews
                      ? `, rated ${shop.rating} stars across ${shop.total_reviews} reviews`
                      : `, rated ${shop.rating} stars on Google`
                    : ''}.
                  This shop isn't currently listed as hiring — request a Shop Day or contact the owner directly to ask about chair availability.
                </p>
              )}

              {/* Sponsored ad spot — demo placement promoting a real DB shop
                  (Sauccy Fades); click opens an advertising inquiry email. */}
              {/* The comparison strip and the shortlist button — see
                  components/shortlist/compare-nearby.tsx for why this is the one
                  thing a directory can do that the business's own listing cannot. */}
              <div className="mb-4 space-y-4">
                <AddToShortlist entityType="shop" slug={shop.slug} name={shop.shop_name} />
                <CompareNearby rows={comparables} originName={shop.shop_name} originRating={shop.rating != null ? Number(shop.rating) : null} />
                <ServiceIntent entityType="shop" entitySlug={shop.slug} city={shop.city} />
                <OwnerGbpStrip isClaimed={isClaimed} businessName={shop.shop_name} />
              </div>
              <ShopSponsoredAd currentSlug={shop.slug} city={shop.city} address={shop.formatted_address} />

              {isHiring && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex gap-4">
                  <Info className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-blue-900 mb-1">Why work here?</h4>
                    <p className="text-blue-800/80 text-sm">We provide an inclusive, professional environment that empowers barbers and stylists to maximize their earning potential. Located in a high-visibility area, this shop is ideal for walk-ins and organic growth.</p>
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
              entityName={shop.shop_name}
              action={<WriteReviewButton entityType="shop" entityId={shop.id} entityName={shop.shop_name} />}
            />

            {/* Google reviews for an owner who connected their Business Profile.
                Fetched live (never stored — Google's terms restrict caching
                review content) and renders nothing when there's no connection. */}
            <GooglePosts entityType="shop" entityId={shop.id} />
            <GoogleReviews entityType="shop" entityId={shop.id} />

            {/* Your Market Ecosystem — barbershop side of the market only */}
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
                      href={`/tools/barbershop-search?ecosystemShopId=${shop.id}&ecosystemShopName=${encodeURIComponent(shop.shop_name)}`}
                      data-ig-click="outbound_lead"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Ask AI About This Market
                    </Link>
                  </div>
                  <p className="text-slate-500 text-sm mb-6 -mt-3">
                    The barbershop side of this shop&apos;s local market — barber schools, barbers seeking placement, competing barbershops, and barber supply stores nearby.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Talent Pipeline — barber schools within 15mi */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <GraduationCap className="w-4 h-4" />
                        Talent Pipeline
                      </div>
                      {talentPipeline.schoolCount > 0 ? (
                        <>
                          <p className="text-sm text-slate-600 mb-3">
                            <span className="font-black text-slate-900 text-lg">{talentPipeline.schoolCount}</span> barber school{talentPipeline.schoolCount === 1 ? "" : "s"} within {radii.talent} mi
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

                    {/* Labor Market — barbers seeking placement within 15mi */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <Users className="w-4 h-4" />
                        Labor Market
                      </div>
                      {laborMarket.seekingPlacement > 0 ? (
                        <>
                          <p className="text-sm text-slate-600 mb-3">
                            <span className="font-black text-slate-900 text-lg">{laborMarket.seekingPlacement}</span> barber{laborMarket.seekingPlacement === 1 ? "" : "s"} seeking placement within {radii.labor} mi
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${toneClasses[marketLabel.tone]}`}>
                            {marketLabel.label}
                          </span>
                        </>
                      ) : gathering}
                    </div>

                    {/* Competitive Landscape — other barbershops within 10mi */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <Scissors className="w-4 h-4" />
                        Competitive Landscape
                      </div>
                      {competition.competitorCount > 0 ? (
                        <p className="text-sm text-slate-600">
                          <span className="font-black text-slate-900 text-lg">{competition.competitorCount}</span> competing barbershop{competition.competitorCount === 1 ? "" : "s"} within {radii.competition} mi
                          {' '}(<span className="font-bold text-green-600">{competition.competitorsHiring} hiring</span>)
                        </p>
                      ) : gathering}
                    </div>

                    {/* Supply Chain — barber supply stores within 15mi */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <ShoppingBag className="w-4 h-4" />
                        Supply Chain
                      </div>
                      {supplyChain.supplyStoreCount > 0 ? (
                        <p className="text-sm text-slate-600">
                          <span className="font-black text-slate-900 text-lg">{supplyChain.supplyStoreCount}</span> barber supply store{supplyChain.supplyStoreCount === 1 ? "" : "s"} within {radii.supply} mi
                          {supplyChain.nearestSupplyStoreName && supplyChain.nearestSupplyStoreMiles != null && (
                            <> · nearest is <span className="font-semibold text-slate-800">{supplyChain.nearestSupplyStoreName}</span> ({supplyChain.nearestSupplyStoreMiles.toFixed(1)}mi)</>
                          )}
                        </p>
                      ) : gathering}
                    </div>

                    {/* Rent Benchmark — booth rent across barbershops within 15mi */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 md:col-span-2">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <Award className="w-4 h-4" />
                        Rent Benchmark
                      </div>
                      {rentBenchmark.localMedianWeeklyRent != null ? (
                        <p className="text-sm text-slate-600">
                          Median weekly booth rent across <span className="font-black text-slate-900">{rentBenchmark.venueCount}</span> barbershop{rentBenchmark.venueCount === 1 ? "" : "s"} within {radii.rent} mi ({rentBenchmark.sampleSize} with listed rent): <span className="font-black text-slate-900">${rentBenchmark.localMedianWeeklyRent}</span>
                          {rentBenchmark.thisWeeklyRent != null && rentBenchmark.percentDiff != null ? (
                            <>
                              {' '}— this shop is <span className={`font-bold inline-flex items-center gap-0.5 ${rentBenchmark.percentDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {rentBenchmark.percentDiff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {Math.abs(Math.round(rentBenchmark.percentDiff))}% {rentBenchmark.percentDiff > 0 ? 'above' : 'below'}
                              </span> the local median.
                            </>
                          ) : (
                            " — this shop's own rent couldn't be parsed from its listing for comparison."
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
                    {shop.rent_rate ? `$${shop.rent_rate}` : "Pricing"}
                  </h3>
                  <p className="text-slate-500 font-semibold">{shop.rent_rate ? "per week" : "Contact Owner"}</p>
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
                <h4 className="font-black text-slate-900 text-lg mb-4">{shop.owner_name && shop.owner_name !== "Unknown Owner" ? shop.owner_name : "Unclaimed (Claim to add)"}</h4>
                
                {/* Call/Website moved up to the page header (old Write A
                    Review slot); Email stays here as the owner-direct channel. */}
                {shop.email && (
                  <div className="grid gap-3 mt-4 relative z-10 grid-cols-1">
                    <a href={`mailto:${shop.email}`} data-ig-click="outbound_lead" className="w-full py-3 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      Email
                    </a>
                  </div>
                )}
              </div>

              <SearchVisibilityCard searchPerformance={searchPerformance} isClaimed={isClaimed} entityLabel="shop" />

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

      </div>

    </div >
  );
}
