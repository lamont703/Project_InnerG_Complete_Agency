import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { RequestShopDayButton } from "@/components/shared/request-shop-day-button";
import { EntityPhotoGallery } from "@/components/shared/entity-photo-gallery";
import { NearbyEntitiesSection } from "@/components/shared/nearby-entities-section";
import { SearchVisibilityCard } from "@/components/shared/search-visibility-card";
import { fetchNearbyEntities } from "@/lib/nearby-entities";
import { buildEntityBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { SALON_PUBLIC_COLUMNS } from "@/lib/public-columns";
import Image from "next/image";
import {
  MapPin,
  Star,
  Phone,
  Globe,
  Clock,
  Navigation,
  Users,
  ExternalLink,
  Landmark,
  Store,
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

  const title = `${salon.shop_name} — Hair & Beauty Salon${salon.city ? ` in ${salon.city}` : ""}`;
  const descParts = [
    salon.shop_name,
    salon.city ? `hair & beauty salon in ${salon.city}` : "hair & beauty salon",
    salon.rating ? `Rated ${Number(salon.rating).toFixed(1)}★` : null,
    salon.total_reviews ? `(${salon.total_reviews} reviews)` : null,
  ].filter(Boolean);
  const description = `${descParts.join('. ')}. View photos, hours, and contact info.`;
  const heroImage = Array.isArray(salon.google_images) ? salon.google_images[0] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `https://agency.innergcomplete.com/salons/${slug}` },
    openGraph: {
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
    };
  }
  const heroImg = Array.isArray(salon.google_images) ? salon.google_images[0] : null;
  if (heroImg) ld.image = heroImg;
  return ld;
}

export default async function SalonProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const salon = await getSalon(slug);

  if (!salon) notFound();
  if (salon._resolvedByLegacyId) permanentRedirect(`/salons/${salon.slug}`);

  const images: string[] = Array.isArray(salon.google_images) ? salon.google_images : [];
  const heroPhoto = images[0] || null;
  const thumbnails = images.slice(1, 5);

  const tagList: string[] = salon.place_types
    ? salon.place_types
        .split("|")
        .map((t: string) => t.trim().replace(/_/g, " "))
        .filter((t: string) => t && !["point of interest", "establishment", "store"].includes(t))
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

  const salonJsonLd = buildSalonJsonLd(salon, websiteHref);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: searchPerfRows } = await supabase.rpc('get_search_performance_by_entity', {
    p_entity_id: salon.id,
    p_result_type: 'salon',
    p_cutoff: thirtyDaysAgo,
  });
  const searchPerformance = (searchPerfRows && searchPerfRows[0]) || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(salonJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildEntityBreadcrumbJsonLd("Salons", "/salons", salon.shop_name, salon.slug)) }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <DynamicBackButton fallbackHref="/tools/barbershop-search?tab=Salons" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Photo Gallery */}
            <EntityPhotoGallery
              heroPhoto={heroPhoto}
              thumbnails={thumbnails}
              name={salon.shop_name}
              gridCols={4}
              accentFrom="from-pink-600"
            />

            {/* Header Block */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{salon.shop_name}</h1>
              {salon.formatted_address && (
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {salon.formatted_address}
                </p>
              )}
              {salon.school_district_name && (
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" />
                  Located in {salon.school_district_name}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {salon.rating && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-900">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    {Number(salon.rating).toFixed(1)}
                    {salon.total_reviews ? (
                      <span className="text-slate-500 font-medium underline decoration-slate-300 underline-offset-2">
                        {salon.total_reviews} reviews
                      </span>
                    ) : null}
                  </span>
                )}
                {salon.business_status && salon.business_status !== "OPERATIONAL" && (
                  <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1 capitalize">
                    {salon.business_status.replace(/_/g, " ").toLowerCase()}
                  </span>
                )}
              </div>

              {tagList.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {tagList.map((t) => (
                    <span key={t} className="text-xs font-bold text-pink-700 bg-pink-50 border border-pink-100 rounded-full px-3 py-1 capitalize">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* About */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <h2 className="text-lg font-black text-slate-900 mb-3">About this salon</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {salon.shop_name} is a hair & beauty salon{salon.city ? ` serving the ${salon.city} area` : ""}
                {salon.rating ? `, rated ${Number(salon.rating).toFixed(1)} stars across ${salon.total_reviews || 0} reviews` : ""}.
                {" "}Visit for haircuts, styling, coloring, and other hair & beauty services.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
              {salon.phone && (
                <a
                  href={`tel:${salon.phone}`}
                  data-ig-click="outbound_lead"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-pink-600/20"
                >
                  <Phone className="w-4 h-4" />
                  Call Salon
                </a>
              )}
              {websiteHref && (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ig-click="outbound_lead"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Visit Website
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <SearchVisibilityCard searchPerformance={searchPerformance} isClaimed={false} entityLabel="salon" />

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                Not ready to reach out yet?
              </p>
              <RequestShopDayButton
                shop={salon}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-pink-600/20"
              />
            </div>

            {directionsHref && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Location</h3>
                <p className="text-sm text-slate-600 font-medium mb-3">{salon.formatted_address || salon.city}</p>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-pink-600 hover:underline"
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
            className="text-sm font-bold text-slate-500 hover:text-pink-600 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
