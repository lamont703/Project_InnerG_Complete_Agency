import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import {
  MapPin,
  Star,
  Phone,
  Globe,
  Clock,
  Navigation,
  Store,
  ExternalLink,
} from "lucide-react";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_COLUMNS = [
  "id",
  "name",
  "formatted_address",
  "city",
  "phone",
  "website",
  "latitude",
  "longitude",
  "rating",
  "total_reviews",
  "place_types",
  "business_status",
  "price_level",
  "google_images",
  "hours",
].join(", ");

async function getStore(id: string): Promise<{ store: any; storeType: "barber_supply" | "beauty_supply" } | null> {
  const { data: barberStore, error: barberError } = await supabase
    .from("agent_barber_supply_store_leads")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .single();

  if (!barberError && barberStore) return { store: barberStore, storeType: "barber_supply" };

  const { data: beautyStore, error: beautyError } = await supabase
    .from("agent_beauty_supply_store_leads")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .single();

  if (!beautyError && beautyStore) return { store: beautyStore, storeType: "beauty_supply" };

  return null;
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const result = await getStore(id);
  if (!result) return { title: "Supply Store Not Found" };
  const { store, storeType } = result;
  const storeLabel = storeType === "beauty_supply" ? "Beauty Supply Store" : "Barber Supply Store";

  const title = `${store.name} — ${storeLabel}${store.city ? ` in ${store.city}` : ""}`;
  const description = `${store.name}${store.formatted_address ? ` at ${store.formatted_address}` : ""}. View photos, hours, ratings, and contact info.`;
  const heroImage = Array.isArray(store.google_images) ? store.google_images[0] : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

const TODAY_INDEX = (new Date().getDay() + 6) % 7; // 0 = Monday, matches Google's weekdayDescriptions order

export default async function SupplyStoreProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const result = await getStore(id);

  if (!result) notFound();
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

  const websiteHref = store.website
    ? store.website.startsWith("http")
      ? store.website
      : `https://${store.website}`
    : null;

  const priceLabel =
    store.price_level && typeof store.price_level === "string"
      ? store.price_level.replace("PRICE_LEVEL_", "").replace(/_/g, " ")
      : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Photo Gallery */}
            {heroPhoto ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                <a href={heroPhoto} target="_blank" rel="noopener noreferrer" className="block w-full aspect-[16/10] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroPhoto} alt={store.name} className="w-full h-full object-cover" />
                </a>
                {thumbnails.length > 0 && (
                  <div className="grid grid-cols-4 gap-0.5 p-0.5 bg-slate-100">
                    {thumbnails.map((url, i) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square overflow-hidden bg-slate-200 group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`${store.name} photo ${i + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-600 to-slate-800 aspect-[16/7] flex items-center justify-center">
                <Store className="w-16 h-16 text-white/40" />
              </div>
            )}

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
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Visit Website
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {directionsHref && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Location</h3>
                <p className="text-sm text-slate-600 font-medium mb-3">{store.formatted_address || store.city}</p>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:underline"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
              </div>
            )}

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
