import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { RequestShopDayButton } from "@/components/shared/request-shop-day-button";
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
} from "lucide-react";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_COLUMNS = [
  "id",
  "shop_name",
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
  "google_images",
  "site_config",
  "school_district_name",
].join(", ");

async function getSalon(id: string) {
  const { data, error } = await supabase
    .from("agent_salon_leads")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as any;
}

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const salon = await getSalon(id);
  if (!salon) return { title: "Salon Not Found" };

  const title = `${salon.shop_name} — Hair & Beauty Salon${salon.city ? ` in ${salon.city}` : ""}`;
  const description = `${salon.shop_name}${salon.formatted_address ? ` at ${salon.formatted_address}` : ""}. View photos, hours, ratings, and contact info.`;
  const heroImage = Array.isArray(salon.google_images) ? salon.google_images[0] : undefined;

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

export default async function SalonProfilePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const salon = await getSalon(id);

  if (!salon) notFound();

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

  const websiteHref = salon.website
    ? salon.website.startsWith("http")
      ? salon.website
      : `https://${salon.website}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <DynamicBackButton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Photo Gallery */}
            {heroPhoto ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                <a href={heroPhoto} target="_blank" rel="noopener noreferrer" className="block w-full aspect-[16/10] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroPhoto} alt={salon.shop_name} className="w-full h-full object-cover" />
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
                        <img src={url} alt={`${salon.shop_name} photo ${i + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-pink-600 to-slate-800 aspect-[16/7] flex items-center justify-center">
                <Users className="w-16 h-16 text-white/40" />
              </div>
            )}

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
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Visit Website
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

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
