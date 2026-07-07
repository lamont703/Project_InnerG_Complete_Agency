import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { CreatePassportButton } from "@/components/shared/create-passport-button";
import {
  MapPin,
  Star,
  Sparkles,
  ExternalLink,
  Instagram,
  Youtube,
  Globe,
  Music2,
  Users,
  Navigation,
  Landmark,
} from "lucide-react";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_COLUMNS = [
  "id",
  "slug",
  "name",
  "address",
  "latitude",
  "longitude",
  "specialty_type",
  "metro_area",
  "instagram_handle",
  "tiktok_handle",
  "youtube_channel",
  "website_url",
  "desired_specialties",
  "profile_url",
  "booksy_photo_url",
  "booksy_cover_photo_url",
  "booksy_gallery_urls",
  "booksy_services",
  "booksy_price_range",
  "booksy_rating",
  "booksy_review_count",
  "school_district_name",
].join(", ");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getCosmetologist(param: string) {
  const { data: bySlug, error: slugErr } = await supabase
    .from("agent_cosmetologist_leads")
    .select(PUBLIC_COLUMNS)
    .eq("slug", param)
    .single();
  if (!slugErr && bySlug) return bySlug as any;

  if (!UUID_RE.test(param)) return null;

  const { data: byId, error: idErr } = await supabase
    .from("agent_cosmetologist_leads")
    .select(PUBLIC_COLUMNS)
    .eq("id", param)
    .single();
  if (idErr || !byId) return null;
  return { ...(byId as any), _resolvedByLegacyId: true };
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const person = await getCosmetologist(slug);
  if (!person) return { title: "Cosmetologist Profile Not Found" };

  const title = `${person.name} — ${person.specialty_type || "Beauty Professional"}${person.metro_area ? ` in ${person.metro_area}` : ""}`;
  const description = `Book with ${person.name}${person.metro_area ? ` in ${person.metro_area}` : ""}. View photos, services, pricing, and reviews.`;
  const heroImage = person.booksy_gallery_urls?.[0] || person.booksy_photo_url;

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

// Person schema — mirrors the barber profile's treatment; a cosmetologist is
// an individual professional, not a business entity.
function buildCosmetologistJsonLd(person: any) {
  const ld: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    jobTitle: person.specialty_type || "Cosmetologist",
  };
  if (person.address) ld.address = { "@type": "PostalAddress", streetAddress: person.address, addressRegion: "TX", addressCountry: "US" };
  if (person.metro_area) ld.homeLocation = { "@type": "Place", name: person.metro_area };
  if (person.website_url) ld.url = person.website_url.startsWith("http") ? person.website_url : `https://${person.website_url}`;
  if (person.booksy_rating && person.booksy_review_count) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(person.booksy_rating),
      reviewCount: Number(person.booksy_review_count),
    };
  }
  const sameAs = [
    person.instagram_handle && `https://instagram.com/${person.instagram_handle.replace("@", "")}`,
    person.tiktok_handle && `https://tiktok.com/@${person.tiktok_handle.replace("@", "")}`,
    person.youtube_channel && `https://youtube.com/@${person.youtube_channel.replace("@", "")}`,
  ].filter(Boolean);
  if (sameAs.length > 0) ld.sameAs = sameAs;

  return ld;
}

export default async function CosmetologistProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const person = await getCosmetologist(slug);

  if (!person) notFound();
  if (person._resolvedByLegacyId) permanentRedirect(`/cosmetologists/${person.slug}`);

  const gallery: string[] = Array.isArray(person.booksy_gallery_urls) ? person.booksy_gallery_urls : [];
  const heroPhoto = gallery[0] || person.booksy_photo_url || null;
  const thumbnails = gallery.slice(1, 7);
  const remainingCount = Math.max(0, gallery.length - 1 - thumbnails.length);

  const services: { name: string; price: number; duration?: string }[] = Array.isArray(person.booksy_services)
    ? person.booksy_services
    : [];
  const specialties: string[] = (person.desired_specialties || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  const directionsHref =
    person.latitude && person.longitude
      ? `https://www.google.com/maps?q=${person.latitude},${person.longitude}`
      : person.address
      ? `https://www.google.com/maps?q=${encodeURIComponent(person.address)}`
      : null;

  const socialLinks = [
    person.instagram_handle && {
      label: "Instagram",
      href: `https://instagram.com/${person.instagram_handle.replace("@", "")}`,
      Icon: Instagram,
    },
    person.tiktok_handle && {
      label: "TikTok",
      href: `https://tiktok.com/@${person.tiktok_handle.replace("@", "")}`,
      Icon: Music2,
    },
    person.youtube_channel && {
      label: "YouTube",
      href: `https://youtube.com/@${person.youtube_channel.replace("@", "")}`,
      Icon: Youtube,
    },
    person.website_url && {
      label: "Website",
      href: person.website_url.startsWith("http") ? person.website_url : `https://${person.website_url}`,
      Icon: Globe,
    },
  ].filter(Boolean) as { label: string; href: string; Icon: any }[];

  const cosmetologistJsonLd = buildCosmetologistJsonLd(person);

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cosmetologistJsonLd) }} />
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
                  <img src={heroPhoto} alt={person.name} className="w-full h-full object-cover" />
                </a>
                {thumbnails.length > 0 && (
                  <div className="grid grid-cols-6 gap-0.5 p-0.5 bg-slate-100">
                    {thumbnails.map((url, i) => {
                      const isLast = i === thumbnails.length - 1 && remainingCount > 0;
                      return (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-square overflow-hidden bg-slate-200 group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`${person.name} photo ${i + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          {isLast && (
                            <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-bold text-sm">
                              +{remainingCount}
                            </div>
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-fuchsia-600 to-slate-800 aspect-[16/7] flex items-center justify-center">
                <Users className="w-16 h-16 text-white/40" />
              </div>
            )}

            {/* Header Block */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{person.name}</h1>
              {person.address && (
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {person.address}
                </p>
              )}
              {person.school_district_name && (
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" />
                  Located in {person.school_district_name}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {person.booksy_rating && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-900">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    {Number(person.booksy_rating).toFixed(1)}
                    {person.booksy_review_count ? (
                      <span className="text-slate-500 font-medium underline decoration-slate-300 underline-offset-2">
                        {person.booksy_review_count} reviews
                      </span>
                    ) : null}
                  </span>
                )}
                {person.booksy_price_range && (
                  <span className="inline-flex items-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1">
                    {person.booksy_price_range}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 font-medium mt-3">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {person.specialty_type || "Beauty Professional"}
                </span>
                {person.metro_area && (
                  <>
                    <span className="opacity-40">·</span>
                    <span>{person.metro_area}</span>
                  </>
                )}
              </div>

              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {specialties.map((s) => (
                    <span key={s} className="text-xs font-bold text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-100 rounded-full px-3 py-1">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {socialLinks.length > 0 && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  {socialLinks.map(({ label, href, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-fuchsia-600 hover:border-fuchsia-200 hover:bg-fuchsia-50 transition-colors"
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Services & Pricing */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <h2 className="text-lg font-black text-slate-900 mb-4">Services</h2>
              {services.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {services.map((service, i) => (
                    <li key={`${service.name}-${i}`} className="flex items-center justify-between gap-4 py-3.5">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-slate-800 block truncate">{service.name}</span>
                        {service.duration && <span className="text-xs text-slate-400 font-medium">{service.duration}</span>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-black text-slate-900">${service.price}</span>
                        {person.profile_url && (
                          <a
                            href={person.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-extrabold uppercase tracking-wider text-white bg-fuchsia-600 hover:bg-fuchsia-700 rounded-lg px-3 py-1.5 transition-colors"
                          >
                            Book
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 font-medium">
                  Pricing not available yet —{" "}
                  {person.profile_url ? (
                    <a href={person.profile_url} target="_blank" rel="noopener noreferrer" className="text-fuchsia-600 font-bold hover:underline">
                      view current pricing on StyleSeat
                    </a>
                  ) : (
                    "check back soon"
                  )}
                  .
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {person.profile_url && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <a
                  href={person.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-fuchsia-600/20"
                >
                  Book on StyleSeat
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">
                Is this you?
              </p>
              <CreatePassportButton
                label="Create Your Career Passport"
                subtext="Get discovered by shops and salons looking to hire"
                className="w-full inline-flex flex-col items-center justify-center gap-1 px-5 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white transition-colors shadow-md shadow-fuchsia-600/20"
              />
            </div>

            {directionsHref && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Location</h3>
                <p className="text-sm text-slate-600 font-medium mb-3">{person.address || person.metro_area}</p>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-fuchsia-600 hover:underline"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <BackToSearchLink
            fallbackHref="/tools/barbershop-search?tab=Cosmetologist"
            className="text-sm font-bold text-slate-500 hover:text-fuchsia-600 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
