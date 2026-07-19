import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { EzoicAd } from "@/components/shared/ezoic-ad";
import { EntityPhotoGallery } from "@/components/shared/entity-photo-gallery";
import { NearbyEntitiesSection } from "@/components/shared/nearby-entities-section";
import { fetchNearbyEntities } from "@/lib/nearby-entities";
import { buildEntityBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { STORE_PUBLIC_COLUMNS } from "@/lib/public-columns";
import { SearchVisibilityCard } from "@/components/shared/search-visibility-card";
import Image from "next/image";
import {
  MapPin,
  Star,
  Phone,
  Globe,
  Clock,
  Navigation,
  Store,
  ExternalLink,
  Search,
  Scissors,
  Sparkles,
} from "lucide-react";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_COLUMNS = STORE_PUBLIC_COLUMNS.join(", ");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getStore(param: string): Promise<{ store: any; storeType: "barber_supply" | "beauty_supply"; resolvedByLegacyId?: boolean } | null> {
  const { data: barberBySlug, error: barberSlugErr } = await supabase
    .from("agent_barber_supply_store_leads")
    .select(PUBLIC_COLUMNS)
    .eq("slug", param)
    .single();
  if (!barberSlugErr && barberBySlug) return { store: barberBySlug, storeType: "barber_supply" };

  const { data: beautyBySlug, error: beautySlugErr } = await supabase
    .from("agent_beauty_supply_store_leads")
    .select(PUBLIC_COLUMNS)
    .eq("slug", param)
    .single();
  if (!beautySlugErr && beautyBySlug) return { store: beautyBySlug, storeType: "beauty_supply" };

  if (!UUID_RE.test(param)) return null;

  const { data: barberById, error: barberIdErr } = await supabase
    .from("agent_barber_supply_store_leads")
    .select(PUBLIC_COLUMNS)
    .eq("id", param)
    .single();
  if (!barberIdErr && barberById) return { store: barberById, storeType: "barber_supply", resolvedByLegacyId: true };

  const { data: beautyById, error: beautyIdErr } = await supabase
    .from("agent_beauty_supply_store_leads")
    .select(PUBLIC_COLUMNS)
    .eq("id", param)
    .single();
  if (!beautyIdErr && beautyById) return { store: beautyById, storeType: "beauty_supply", resolvedByLegacyId: true };

  return null;
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const result = await getStore(slug);
  if (!result) return { title: "Supply Store Not Found" };
  const { store, storeType } = result;
  const storeLabel = storeType === "beauty_supply" ? "Beauty Supply Store" : "Barber Supply Store";

  const title = `${store.name} — ${storeLabel}${store.city ? ` in ${store.city}` : ""}`;
  const descParts = [
    store.name,
    store.city ? `${storeLabel.toLowerCase()} in ${store.city}` : storeLabel.toLowerCase(),
    store.rating ? `Rated ${Number(store.rating).toFixed(1)}★` : null,
    store.total_reviews ? `(${store.total_reviews} reviews)` : null,
  ].filter(Boolean);
  const description = `${descParts.join('. ')}. View hours, photos, and find nearby shops.`;
  const heroImage = Array.isArray(store.google_images) ? store.google_images[0] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `https://agency.innergcomplete.com/stores/${slug}` },
    openGraph: {
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

const TODAY_INDEX = (new Date().getDay() + 6) % 7; // 0 = Monday, matches Google's weekdayDescriptions order

// Store — both barber-supply and beauty-supply are retail businesses.
function buildStoreJsonLd(store: any, websiteHref: string | null) {
  const ld: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
  };
  if (store.formatted_address) ld.address = { "@type": "PostalAddress", streetAddress: store.formatted_address, addressRegion: "TX", addressCountry: "US" };
  if (store.latitude && store.longitude) ld.geo = { "@type": "GeoCoordinates", latitude: store.latitude, longitude: store.longitude };
  if (store.phone) ld.telephone = store.phone;
  if (websiteHref) ld.url = websiteHref;
  if (store.rating && store.total_reviews) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(store.rating),
      reviewCount: Number(store.total_reviews),
      bestRating: 5,
      worstRating: 1,
    };
  }
  const heroImg = Array.isArray(store.google_images) ? store.google_images[0] : null;
  if (heroImg) ld.image = heroImg;
  return ld;
}

export default async function SupplyStoreProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const result = await getStore(slug);

  if (!result) notFound();
  if (result.resolvedByLegacyId) permanentRedirect(`/stores/${result.store.slug}`);
  const { store, storeType } = result;
  const storeLabel = storeType === "beauty_supply" ? "Beauty Supply Store" : "Barber Supply Store";
  const aboutBlurb =
    storeType === "beauty_supply"
      ? "Visit for hair care products, wigs, extensions, and professional styling supplies."
      : "Visit for professional clippers, shears, chemicals, and grooming supplies.";

  const images: string[] = Array.isArray(store.google_images) ? store.google_images : [];
  const heroPhoto = images[0] || null;
  const thumbnails = images.slice(1, 5);

  const tagList: string[] = store.place_types
    ? store.place_types
        .split("|")
        .map((t: string) => t.trim().replace(/_/g, " "))
        .filter((t: string) => t && !["point of interest", "establishment", "store"].includes(t))
    : [];

  const hours: string[] = Array.isArray(store.hours) ? store.hours : [];

  const directionsHref =
    store.latitude && store.longitude
      ? `https://www.google.com/maps?q=${store.latitude},${store.longitude}`
      : store.formatted_address
      ? `https://www.google.com/maps?q=${encodeURIComponent(store.formatted_address)}`
      : null;

  const storeCenter =
    store.latitude && store.longitude ? { lat: Number(store.latitude), lng: Number(store.longitude) } : null;
  const [nearbyShops, nearbySalons] = storeCenter
    ? await Promise.all([
        fetchNearbyEntities(supabase, "shops", storeCenter, { limit: 5 }),
        fetchNearbyEntities(supabase, "salons", storeCenter, { limit: 5 }),
      ])
    : [[], []];

  const websiteHref = store.website
    ? store.website.startsWith("http")
      ? store.website
      : `https://${store.website}`
    : null;

  const priceLabel =
    store.price_level && typeof store.price_level === "string"
      ? store.price_level.replace("PRICE_LEVEL_", "").replace(/_/g, " ")
      : null;

  const storeJsonLd = buildStoreJsonLd(store, websiteHref);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: searchPerfRows } = await supabase.rpc('get_search_performance_by_entity', {
    p_entity_id: store.id,
    p_result_type: 'store',
    p_cutoff: thirtyDaysAgo,
  });
  const searchPerformance = (searchPerfRows && searchPerfRows[0]) || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildEntityBreadcrumbJsonLd("Stores", "/stores", store.name, store.slug)) }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <DynamicBackButton fallbackHref="/tools/barbershop-search?tab=Stores" />
        <EzoicAd className="mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Photo Gallery */}
            <EntityPhotoGallery
              heroPhoto={heroPhoto}
              thumbnails={thumbnails}
              name={store.name}
              gridCols={4}
              accentFrom="from-emerald-600"
              fallbackIcon="store"
            />

            {/* Header Block */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{store.name}</h1>
              {store.formatted_address && (
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {store.formatted_address}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {store.rating && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-900">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    {Number(store.rating).toFixed(1)}
                    {store.total_reviews ? (
                      <span className="text-slate-500 font-medium underline decoration-slate-300 underline-offset-2">
                        {store.total_reviews} reviews
                      </span>
                    ) : null}
                  </span>
                )}
                {priceLabel && (
                  <span className="inline-flex items-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1 capitalize">
                    {priceLabel.toLowerCase()}
                  </span>
                )}
                {store.business_status && store.business_status !== "OPERATIONAL" && (
                  <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1 capitalize">
                    {store.business_status.replace(/_/g, " ").toLowerCase()}
                  </span>
                )}
              </div>

              {tagList.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {tagList.map((t) => (
                    <span key={t} className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 capitalize">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* About */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <h2 className="text-lg font-black text-slate-900 mb-3">About this store</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {store.name} is a {storeLabel.toLowerCase()}{store.city ? ` serving the ${store.city} area` : ""}
                {store.rating ? `, rated ${Number(store.rating).toFixed(1)} stars across ${store.total_reviews || 0} reviews` : ""}.
                {" "}{aboutBlurb}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
              {store.phone && (
                <a
                  href={`tel:${store.phone}`}
                  data-ig-click="outbound_lead"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-emerald-600/20"
                >
                  <Phone className="w-4 h-4" />
                  Call Store
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

            <SearchVisibilityCard searchPerformance={searchPerformance} isClaimed={false} entityLabel="store" />

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                Nearby
              </p>
              <Link
                href={`/tools/barbershop-search?tab=Barbershops${store.city ? `&q=${encodeURIComponent(store.city)}` : ""}`}
                data-ig-click="outbound_lead"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-extrabold text-sm uppercase tracking-wider transition-colors"
              >
                <Search className="w-4 h-4" />
                Find Shops Near This Store
              </Link>
            </div>

            {directionsHref && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Location</h3>
                <p className="text-sm text-slate-600 font-medium mb-3">{store.formatted_address || store.city}</p>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ig-click="outbound_lead"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:underline"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
              </div>
            )}

            <NearbyEntitiesSection title="Nearby Shops" icon={Scissors} entities={nearbyShops} />
            <NearbyEntitiesSection title="Nearby Salons" icon={Sparkles} entities={nearbySalons} />

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
            fallbackHref="/tools/barbershop-search?tab=Stores"
            className="text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
