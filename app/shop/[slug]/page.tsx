import { createClient } from "@supabase/supabase-js";
import { Metadata, ResolvingMetadata } from "next";
import { Footer } from "@/components/layout/footer";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { MapPin, Star, Scissors, CheckCircle2, ShieldCheck, Lock, Award, Users, ChevronLeft, Map as MapIcon, Mail, Phone, Info, GraduationCap, TrendingUp, TrendingDown, ShoppingBag, Sparkles, Landmark } from "lucide-react";
import { computeShopEcosystemReport } from "@/lib/shop-ecosystem";
import Image from "next/image";
import { ShopPhotoGallery } from "@/components/shared/shop-photo-gallery";
import { buildEntityBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { RequestShopDayButton } from "@/components/shared/request-shop-day-button";
import { ClaimShopButton } from "@/components/shared/claim-shop-button";
import { PassportCarousel } from "@/components/shared/passport-carousel";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { SearchVisibilityCard } from "@/components/shared/search-visibility-card";

export const dynamic = 'force-dynamic';

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

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;

  const metaSelect = "shop_name,city,shop_image_url";
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

  const title = `${shop.shop_name} is Hiring on Shop Day Network`;
  const descParts = [
    `${shop.shop_name} in ${shop.city}`,
    shop.booth_count_available ? `— ${shop.booth_count_available} chair${shop.booth_count_available > 1 ? 's' : ''} available` : null,
    shop.rent_type ? `(${shop.rent_type}${shop.rent_rate ? ` at $${shop.rent_rate}/week` : ''})` : null,
    shop.rating ? `Rated ${shop.rating}★` : null,
    shop.total_reviews ? `(${shop.total_reviews} reviews)` : null,
  ].filter(Boolean);
  const description = `${descParts.join('. ')}. View photos and request a Shop Day.`;
  const image = shop.shop_image_url || "/shop_day_card.jpg";

  return {
    title,
    description,
    alternates: { canonical: `https://agency.innergcomplete.com/shop/${resolvedParams.slug}` },
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

  const ecosystemReport = await computeShopEcosystemReport(supabase, shop);

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

  const tagList = shop.place_types
    ? shop.place_types.split('|').map((t: string) => t.trim().replace('_', ' ')).filter((t: string) => t !== 'point of interest' && t !== 'establishment' && t !== 'service' && t !== 'health')
    : [];

  const maskEmail = (email: string) => email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';
  const maskPhone = (phone: string) => phone ? phone.replace(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/, '(***) ***-****') : '';

  // Prepare images array, fallback to shop_image_url
  const images = shop.google_images && Array.isArray(shop.google_images) && shop.google_images.length > 0
    ? shop.google_images
    : [shop.shop_image_url || "/images/default_shop_image.png"];

  // LocalBusiness — a barbershop is a physical business entity.
  const shopJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: shop.shop_name,
  };
  if (shop.formatted_address) shopJsonLd.address = { "@type": "PostalAddress", streetAddress: shop.formatted_address, addressRegion: "TX", addressCountry: "US" };
  if (shop.latitude && shop.longitude) shopJsonLd.geo = { "@type": "GeoCoordinates", latitude: shop.latitude, longitude: shop.longitude };
  if (shop.phone) shopJsonLd.telephone = shop.phone;
  if (shop.rating && shop.total_reviews) {
    shopJsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(shop.rating),
      reviewCount: Number(shop.total_reviews),
    };
  }
  if (images[0]) shopJsonLd.image = images[0];

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
  const shopFaqJsonLd = shopFaqEntries.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: shopFaqEntries.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-500/20 flex flex-col overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(shopJsonLd) }} />
      {shopFaqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(shopFaqJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildEntityBreadcrumbJsonLd("Barbershops", "/shop", shop.shop_name, shop.slug)) }} />

      <div className="flex-grow pt-8 pb-20 px-4 md:px-8 max-w-7xl mx-auto w-full">
        
        <DynamicBackButton fallbackHref="/tools/barbershop-search" />

        {/* Header Title & Badges */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div>
            <h1 className="font-black text-3xl md:text-5xl text-slate-900 tracking-tight leading-tight mb-2">
              {shop.shop_name}
            </h1>
            <div className="flex items-center gap-4 text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 underline decoration-slate-300 underline-offset-4 cursor-pointer hover:text-slate-900">
                <MapPin className="w-4 h-4" />
                {shop.formatted_address || `${shop.city}, TX`}
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-900">{shop.rating || "4.8"}</span>
                <span className="text-slate-500 underline decoration-slate-300 underline-offset-4 cursor-pointer">({shop.total_reviews || 0} reviews)</span>
              </span>
              {shop.school_district_name && (
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  Located in {shop.school_district_name}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {isClaimed ? (
              <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-6 py-3 rounded-xl font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Claimed
              </span>
            ) : (
              <ClaimShopButton shop={shop} />
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
              : "Off Market"
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
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Welcome to {shop.shop_name}, a premier grooming destination located in the heart of {shop.city}. We are currently seeking professional, driven individuals to join our growing team.
                With high foot traffic, excellent local ratings ({shop.rating} stars across {shop.total_reviews} reviews), and a modern atmosphere, this is the perfect location to build and scale your clientele.
              </p>
              
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex gap-4">
                <Info className="w-6 h-6 text-blue-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-blue-900 mb-1">Why work here?</h4>
                  <p className="text-blue-800/80 text-sm">We provide an inclusive, professional environment that empowers barbers and stylists to maximize their earning potential. Located in a high-visibility area, this shop is ideal for walk-ins and organic growth.</p>
                </div>
              </div>
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

            {/* Your Market Ecosystem */}
            {ecosystemReport && (() => {
              const { talentPipeline, laborSupply, competition, laborMarketRatio, supplyChain, rentBenchmark } = ecosystemReport;
              const marketLabel = laborMarketRatio == null
                ? { label: "Not Enough Data", tone: "slate" as const }
                : laborMarketRatio >= 2
                ? { label: "Talent-Rich — Easy to Hire", tone: "green" as const }
                : laborMarketRatio >= 0.5
                ? { label: "Balanced Market", tone: "amber" as const }
                : { label: "Competitive for Talent", tone: "red" as const };
              const toneClasses: Record<string, string> = {
                green: "bg-green-50 text-green-700 border-green-200",
                amber: "bg-amber-50 text-amber-700 border-amber-200",
                red: "bg-red-50 text-red-700 border-red-200",
                slate: "bg-slate-50 text-slate-600 border-slate-200",
              };
              const scoreTone = (score: number) => score >= 85 ? "text-green-600" : score >= 70 ? "text-amber-600" : "text-red-600";

              return (
                <div className="pb-10 border-b border-slate-200">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                    <h2 className="text-2xl font-black text-slate-900">Your Market Ecosystem</h2>
                    <Link
                      href={`/tools/barbershop-search?ecosystemShopId=${shop.id}&ecosystemShopName=${encodeURIComponent(shop.shop_name)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Ask AI About This Market
                    </Link>
                  </div>
                  <p className="text-slate-500 text-sm mb-6 -mt-3">
                    Computed from every school, professional, competitor, and supply store within {ecosystemReport.radiusMiles} miles.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Talent Pipeline */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <GraduationCap className="w-4 h-4" />
                        Talent Pipeline
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        <span className="font-black text-slate-900 text-lg">{talentPipeline.schoolCount}</span> barber &amp; cosmetology schools nearby
                        {talentPipeline.avgLeaderboardScore != null && (
                          <> · avg 2026 score <span className={`font-bold ${scoreTone(talentPipeline.avgLeaderboardScore)}`}>{Math.round(talentPipeline.avgLeaderboardScore)}</span></>
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
                    </div>

                    {/* Labor Market */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <Users className="w-4 h-4" />
                        Labor Market
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        <span className="font-black text-slate-900 text-lg">{laborSupply.barbersSeekingPlacement}</span> barbers seeking placement,{' '}
                        <span className="font-black text-slate-900 text-lg">{laborSupply.cosmetologistsInArea}</span> cosmetologists in area
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${toneClasses[marketLabel.tone]}`}>
                        {marketLabel.label}
                      </span>
                    </div>

                    {/* Competition */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <Scissors className="w-4 h-4" />
                        Competitive Landscape
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-black text-slate-900 text-lg">{competition.nearbyShopCount}</span> competing shops
                        {' '}(<span className="font-bold text-green-600">{competition.nearbyShopsHiring} hiring</span>) ·{' '}
                        <span className="font-black text-slate-900 text-lg">{competition.nearbySalonCount}</span> salons nearby
                      </p>
                    </div>

                    {/* Supply Chain */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                        <ShoppingBag className="w-4 h-4" />
                        Supply Chain
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-black text-slate-900 text-lg">{supplyChain.supplyStoreCount}</span> supply stores nearby
                        {supplyChain.nearestSupplyStoreName && supplyChain.nearestSupplyStoreMiles != null && (
                          <> · nearest is <span className="font-semibold text-slate-800">{supplyChain.nearestSupplyStoreName}</span> ({supplyChain.nearestSupplyStoreMiles.toFixed(1)}mi)</>
                        )}
                      </p>
                    </div>

                    {/* Rent Benchmark */}
                    {rentBenchmark.localMedianWeeklyRent != null && (
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 md:col-span-2">
                        <div className="flex items-center gap-2 text-slate-900 font-bold mb-3">
                          <Award className="w-4 h-4" />
                          Rent Benchmark
                        </div>
                        <p className="text-sm text-slate-600">
                          Local median weekly booth rent (from {rentBenchmark.sampleSize} nearby listings): <span className="font-black text-slate-900">${rentBenchmark.localMedianWeeklyRent}</span>
                          {rentBenchmark.thisShopWeeklyRent != null && rentBenchmark.percentDiff != null ? (
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
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Right Column (Sticky Sidebar) */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 bg-white border border-slate-200 rounded-[2rem] shadow-2xl p-8">
              
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-2xl text-slate-900 mb-1">
                    {shop.rent_rate ? `$${shop.rent_rate}` : "Pricing"}
                  </h3>
                  <p className="text-slate-500 font-semibold">{shop.rent_rate ? "per week" : "Contact Owner"}</p>
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                  Available
                </div>
              </div>

              {/* Owner Box */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-5">
                  <ShieldCheck className="w-24 h-24" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Managed By</p>
                <h4 className="font-black text-slate-900 text-lg mb-4">{shop.owner_name && shop.owner_name !== "Unknown Owner" ? shop.owner_name : "Unclaimed (Claim to add)"}</h4>
                
                {(shop.email || shop.phone) && (
                  <div className={`grid gap-3 mt-4 relative z-10 ${shop.email && shop.phone ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {shop.email && (
                      <a href={`mailto:${shop.email}`} data-ig-click="outbound_lead" className="w-full py-3 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        Email
                      </a>
                    )}
                    {shop.phone && (
                      <a href={`tel:${shop.phone}`} data-ig-click="outbound_lead" className="w-full py-3 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        Call
                      </a>
                    )}
                  </div>
                )}
              </div>

              <SearchVisibilityCard searchPerformance={searchPerformance} isClaimed={isClaimed} entityLabel="shop" />

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Lock className="w-3 h-3" />
                Secure contact via Barber & Beauty Network
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Not ready to reach out yet?
                </p>
                <RequestShopDayButton
                  shop={shop}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-slate-50 border-t border-slate-200 py-20 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full overflow-hidden">
          <h2 className="text-2xl md:text-3xl px-2 font-black text-slate-900 mb-2 text-center break-words">Top Candidates Seeking Placement</h2>
          <p className="text-center text-slate-500 mb-10 max-w-2xl mx-auto">Discover highly vetted professionals who are currently actively seeking placement in your area.</p>
          <div className="w-full overflow-visible">
            <PassportCarousel />
          </div>
        </div>
      </div>

      <div className="light bg-slate-50 text-slate-900">
        <Footer />
      </div>
    </div >
  );
}
