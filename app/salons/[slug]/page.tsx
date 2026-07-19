import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { EzoicAd } from "@/components/shared/ezoic-ad";
import { RequestShopDayButton } from "@/components/shared/request-shop-day-button";
import { ClaimShopButton } from "@/components/shared/claim-shop-button";
import { ShopPhotoGallery } from "@/components/shared/shop-photo-gallery";
import { NearbyEntitiesSection } from "@/components/shared/nearby-entities-section";
import { SearchVisibilityCard } from "@/components/shared/search-visibility-card";
import { fetchNearbyEntities } from "@/lib/nearby-entities";
import { buildEntityBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { computeShopEcosystemReport } from "@/lib/shop-ecosystem";
import { SALON_PUBLIC_COLUMNS } from "@/lib/public-columns";
import {
  MapPin,
  Star,
  Phone,
  Mail,
  Globe,
  Clock,
  Navigation,
  Users,
  ExternalLink,
  Landmark,
  Store,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Award,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Sparkles,
  Scissors,
  Info,
} from "lucide-react";

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
  const title = isHiring
    ? `${salon.shop_name} is Hiring on Shop Day Network`
    : `${salon.shop_name} — Hair & Beauty Salon${salon.city ? ` in ${salon.city}` : ""}`;
  const descParts = [
    `${salon.shop_name}${salon.city ? ` in ${salon.city}` : ""}`,
    salon.booth_count_available ? `— ${salon.booth_count_available} chair${salon.booth_count_available > 1 ? 's' : ''} available` : null,
    salon.rent_type ? `(${salon.rent_type}${salon.rent_rate ? ` at $${salon.rent_rate}/week` : ''})` : null,
    salon.rating ? `Rated ${Number(salon.rating).toFixed(1)}★` : null,
    salon.total_reviews ? `(${salon.total_reviews} reviews)` : null,
  ].filter(Boolean);
  const nearbyAreas: string[] = Array.isArray(salon.nearby_areas) ? salon.nearby_areas : [];
  const nearbyAreasNote = nearbyAreas.length > 0 ? ` Also serving ${nearbyAreas.join(", ")}.` : "";
  const description = isHiring
    ? `${descParts.join('. ')}. View photos and request a Shop Day.${nearbyAreasNote}`
    : `${descParts.join('. ')}. View photos, hours, and contact info.${nearbyAreasNote}`;
  const heroImage = (Array.isArray(salon.google_images) && salon.google_images[0]) || salon.shop_image_url || undefined;

  return {
    title,
    description,
    alternates: { canonical: `https://agency.innergcomplete.com/salons/${slug}` },
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
  const ld: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: salon.shop_name,
  };
  if (salon.formatted_address) ld.address = { "@type": "PostalAddress", streetAddress: salon.formatted_address, addressRegion: "TX", addressCountry: "US" };
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
  if (Array.isArray(salon.nearby_areas) && salon.nearby_areas.length > 0) ld.areaServed = salon.nearby_areas;
  return ld;
}

export default async function SalonProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const salon = await getSalon(slug);

  if (!salon) notFound();
  if (salon._resolvedByLegacyId) permanentRedirect(`/salons/${salon.slug}`);

  const ecosystemReport = await computeShopEcosystemReport(supabase, salon);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: searchPerfRows } = await supabase.rpc('get_search_performance_by_entity', {
    p_entity_id: salon.id,
    p_result_type: 'salon',
    p_cutoff: thirtyDaysAgo,
  });
  const searchPerformance = (searchPerfRows && searchPerfRows[0]) || null;
  // claimed_at doesn't exist on agent_salon_leads yet (only on
  // agent_barbershop_leads so far) — this evaluates to false today and
  // will start working automatically once that column is added and
  // selected here, same forward-compatible pattern as the other
  // booth-rent fields above.
  const isClaimed = !!salon.claimed_at;
  const isHiring = !!(salon.hiring_need || (salon.booth_count_available && salon.booth_count_available >= 1));

  const tagList: string[] = salon.place_types
    ? salon.place_types
        .split("|")
        .map((t: string) => t.trim().replace(/_/g, " "))
        .filter((t: string) => !["point of interest", "establishment", "service", "health", "store"].includes(t))
    : [];

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
  const salonFaqJsonLd = salonFaqEntries.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: salonFaqEntries.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-500/20 flex flex-col overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(salonJsonLd) }} />
      {salonFaqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(salonFaqJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildEntityBreadcrumbJsonLd("Salons", "/salons", salon.shop_name, salon.slug)) }} />

      <div className="flex-grow pt-8 pb-20 px-4 md:px-8 max-w-7xl mx-auto w-full">

        <DynamicBackButton fallbackHref="/tools/barbershop-search?tab=Salons" />

        <EzoicAd className="mb-6" />

        {/* Header Title & Badges */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div>
            <h1 className="font-black text-3xl md:text-5xl text-slate-900 tracking-tight leading-tight mb-2">
              {salon.shop_name}
            </h1>
            <div className="flex items-center gap-4 text-slate-600 font-medium flex-wrap">
              <span className="flex items-center gap-1.5 underline decoration-slate-300 underline-offset-4 cursor-pointer hover:text-slate-900">
                <MapPin className="w-4 h-4" />
                {salon.formatted_address || `${salon.city}, TX`}
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-900">{salon.rating || "4.8"}</span>
                <span className="text-slate-500 underline decoration-slate-300 underline-offset-4 cursor-pointer">({salon.total_reviews || 0} reviews)</span>
              </span>
              {salon.school_district_name && (
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" />
                  Located in {salon.school_district_name}
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
              <ClaimShopButton shop={salon} entityType="salon" />
            )}
          </div>
        </div>

        {/* Real Estate Image Gallery (Masonry on Desktop, Swipe Carousel on Mobile) */}
        <ShopPhotoGallery
          images={images}
          shopName={salon.shop_name}
          badgeLabel={isHiring ? `${salon.booth_count_available || 1} Chairs Available` : "Off Market"}
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
              {isHiring ? (
                <>
                  <p className="text-slate-600 text-lg leading-relaxed mb-6">
                    Welcome to {salon.shop_name}, a premier styling destination located in the heart of {salon.city}. We are currently seeking professional, driven stylists to join our growing team.
                    With high foot traffic, excellent local ratings ({salon.rating} stars across {salon.total_reviews} reviews), and a modern atmosphere, this is the perfect location to build and scale your clientele.
                  </p>

                  <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex gap-4">
                    <Info className="w-6 h-6 text-blue-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-blue-900 mb-1">Why work here?</h4>
                      <p className="text-blue-800/80 text-sm">We provide an inclusive, professional environment that empowers stylists to maximize their earning potential. Located in a high-visibility area, this salon is ideal for walk-ins and organic growth.</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-600 text-lg leading-relaxed mb-6">
                  {salon.shop_name} is a hair & beauty salon located in {salon.city}, TX
                  {salon.rating ? `, rated ${Number(salon.rating).toFixed(1)} stars across ${salon.total_reviews || 0} reviews` : ''}.
                  This salon isn't currently listed as hiring — request a Shop Day or contact the owner directly to ask about chair availability.
                </p>
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
                      href={`/tools/barbershop-search?ecosystemShopId=${salon.id}&ecosystemShopName=${encodeURIComponent(salon.shop_name)}`}
                      data-ig-click="outbound_lead"
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
                        <span className="font-black text-slate-900 text-lg">{competition.nearbyShopCount}</span> nearby barbershops ·{' '}
                        <span className="font-black text-slate-900 text-lg">{competition.nearbySalonCount}</span> competing salons
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
                              {' '}— this salon is <span className={`font-bold inline-flex items-center gap-0.5 ${rentBenchmark.percentDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {rentBenchmark.percentDiff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {Math.abs(Math.round(rentBenchmark.percentDiff))}% {rentBenchmark.percentDiff > 0 ? 'above' : 'below'}
                              </span> the local median.
                            </>
                          ) : (
                            " — this salon's own rent couldn't be parsed from its listing for comparison."
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
                  {isHiring ? "Available" : "Off Market"}
                </div>
              </div>

              {/* Owner Box */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-5">
                  <ShieldCheck className="w-24 h-24" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Managed By</p>
                <h4 className="font-black text-slate-900 text-lg mb-4">{salon.owner_name && salon.owner_name !== "Unknown Owner" ? salon.owner_name : "Unclaimed (Claim to add)"}</h4>

                {(salon.email || salon.phone || websiteHref) && (
                  <div className={`grid gap-3 mt-4 relative z-10 ${[salon.email, salon.phone, websiteHref].filter(Boolean).length >= 3 ? 'grid-cols-3' : [salon.email, salon.phone, websiteHref].filter(Boolean).length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {salon.email && (
                      <a href={`mailto:${salon.email}`} data-ig-click="outbound_lead" className="w-full py-3 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        Email
                      </a>
                    )}
                    {salon.phone && (
                      <a href={`tel:${salon.phone}`} data-ig-click="outbound_lead" className="w-full py-3 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        Call
                      </a>
                    )}
                    {websiteHref && (
                      <a href={websiteHref} target="_blank" rel="noopener noreferrer" data-ig-click="outbound_lead" className="w-full py-3 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                        <Globe className="w-4 h-4 text-slate-500" />
                        Site
                      </a>
                    )}
                  </div>
                )}
              </div>

              <SearchVisibilityCard searchPerformance={searchPerformance} isClaimed={isClaimed} entityLabel="salon" />

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Lock className="w-3 h-3" />
                Secure contact via Barber & Beauty Network
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                  Not ready to reach out yet?
                </p>
                <RequestShopDayButton
                  shop={salon}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
                />
              </div>
            </div>

            {/* Salon-specific extras — not on shop pages yet, kept as
                supplementary cards below the core (now shop-identical)
                sidebar rather than dropped outright. */}
            {directionsHref && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Location</h3>
                <p className="text-sm text-slate-600 font-medium mb-3">{salon.formatted_address || salon.city}</p>
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
              </div>
            )}

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
