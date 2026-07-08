import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { CreatePassportButton } from "@/components/shared/create-passport-button";
import Image from "next/image";
import {
  MapPin,
  Star,
  CheckCircle2,
  GraduationCap,
  Scissors,
  ExternalLink,
  Instagram,
  Youtube,
  Globe,
  Music2,
  Users,
  Clock,
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
  "status",
  "is_actively_looking",
  "school_name",
  "licensure_status",
  "completed_school_hours",
  "instagram_handle",
  "tiktok_handle",
  "youtube_channel",
  "website_url",
  "placement_pathway",
  "desired_specialties",
  "profile_url",
  "passport_image_url",
  "booksy_photo_url",
  "booksy_cover_photo_url",
  "booksy_gallery_urls",
  "booksy_services",
  "booksy_price_range",
  "booksy_rating",
  "booksy_review_count",
  "booksy_hours",
  "school_district_name",
].join(", ");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getBarber(param: string) {
  const { data: bySlug, error: slugErr } = await supabase
    .from("agent_barber_leads")
    .select(PUBLIC_COLUMNS)
    .eq("slug", param)
    .single();
  if (!slugErr && bySlug) return bySlug as any;

  if (!UUID_RE.test(param)) return null;

  const { data: byId, error: idErr } = await supabase
    .from("agent_barber_leads")
    .select(PUBLIC_COLUMNS)
    .eq("id", param)
    .single();
  if (idErr || !byId) return null;
  return { ...(byId as any), _resolvedByLegacyId: true };
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const barber = await getBarber(slug);
  if (!barber) return { title: "Barber Profile Not Found" };

  const title = `${barber.name} — ${barber.specialty_type || "Professional Barber"}${barber.metro_area ? ` in ${barber.metro_area}` : ""}`;
  const descParts = [
    `${barber.name}`,
    barber.specialty_type ? barber.specialty_type : "Professional Barber",
    barber.metro_area ? `in ${barber.metro_area}` : null,
    barber.booksy_rating ? `Rated ${Number(barber.booksy_rating).toFixed(1)}★` : null,
    barber.booksy_review_count ? `(${barber.booksy_review_count} reviews)` : null,
    barber.booksy_price_range ? barber.booksy_price_range : null,
  ].filter(Boolean);
  const description = `${descParts.join('. ')}. View gallery, services, and book online.`;
  const heroImage = barber.booksy_gallery_urls?.[0] || barber.booksy_photo_url;

  return {
    title,
    description,
    alternates: { canonical: `https://agency.innergcomplete.com/barbers/${slug}` },
    openGraph: {
      title,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

function formatPrice(price: number, currency: string) {
  if (currency === "USD") return `$${price}`;
  return `${price} ${currency}`;
}

// Person schema — a barber is an individual professional, not a business
// entity, so LocalBusiness would misrepresent the data. Every field is
// conditional on real data; nothing here is guessed.
function buildBarberJsonLd(barber: any) {
  const person: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: barber.name,
    jobTitle: barber.specialty_type || "Barber",
  };
  if (barber.address) person.address = { "@type": "PostalAddress", streetAddress: barber.address, addressRegion: "TX", addressCountry: "US" };
  if (barber.metro_area) person.homeLocation = { "@type": "Place", name: barber.metro_area };
  if (barber.latitude && barber.longitude) person.geo = { "@type": "GeoCoordinates", latitude: barber.latitude, longitude: barber.longitude };
  if (barber.website_url) person.url = barber.website_url.startsWith("http") ? barber.website_url : `https://${barber.website_url}`;
  if (barber.booksy_rating && barber.booksy_review_count) {
    person.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(barber.booksy_rating),
      reviewCount: Number(barber.booksy_review_count),
    };
  }
  const heroImg = barber.booksy_gallery_urls?.[0] || barber.booksy_photo_url;
  if (heroImg) person.image = heroImg;
  const sameAs = [
    barber.instagram_handle && `https://instagram.com/${barber.instagram_handle.replace("@", "")}`,
    barber.tiktok_handle && `https://tiktok.com/@${barber.tiktok_handle.replace("@", "")}`,
    barber.youtube_channel && `https://youtube.com/@${barber.youtube_channel.replace("@", "")}`,
  ].filter(Boolean);
  if (sameAs.length > 0) person.sameAs = sameAs;

  return person;
}

function buildBarberFaqJsonLd(barber: any, services: { name: string; price: number; currency: string }[]) {
  const faqEntries: { q: string; a: string }[] = [];
  if (barber.address || barber.metro_area) {
    faqEntries.push({
      q: `Where is ${barber.name} located?`,
      a: `${barber.name} is located${barber.address ? ` at ${barber.address}` : ''}${barber.metro_area ? ` in the ${barber.metro_area} area` : ''}.`,
    });
  }
  if (services.length > 0) {
    const topServices = services.slice(0, 3).map(s => s.name).join(', ');
    faqEntries.push({
      q: `What services does ${barber.name} offer?`,
      a: `${barber.name} offers ${services.length} services including ${topServices}.`,
    });
    const priceRange = services.map(s => s.price).filter(p => p > 0);
    if (priceRange.length > 0) {
      faqEntries.push({
        q: `What are ${barber.name}'s prices?`,
        a: `Prices range from $${Math.min(...priceRange)} to $${Math.max(...priceRange)}.`,
      });
    }
  }
  if (faqEntries.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntries.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

const TODAY_INDEX = (new Date().getDay() + 6) % 7; // 0 = Monday, matches DAY_ORDER

export default async function BarberProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const barber = await getBarber(slug);

  if (!barber) notFound();
  if (barber._resolvedByLegacyId) permanentRedirect(`/barbers/${barber.slug}`);

  const gallery: string[] = Array.isArray(barber.booksy_gallery_urls) ? barber.booksy_gallery_urls : [];
  const heroPhoto = gallery[0] || barber.booksy_photo_url || barber.passport_image_url || null;
  const thumbnails = gallery.slice(1, 7);
  const remainingCount = Math.max(0, gallery.length - 1 - thumbnails.length);

  const isLooking = barber.status === "interested_in_placement" && barber.is_actively_looking === true;
  const services: { name: string; price: number; currency: string }[] = Array.isArray(barber.booksy_services)
    ? barber.booksy_services
    : [];
  const specialties: string[] = (barber.desired_specialties || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const hours: { day: string; ranges: string[] }[] = Array.isArray(barber.booksy_hours) ? barber.booksy_hours : [];

  const directionsHref =
    barber.latitude && barber.longitude
      ? `https://www.google.com/maps?q=${barber.latitude},${barber.longitude}`
      : barber.address
      ? `https://www.google.com/maps?q=${encodeURIComponent(barber.address)}`
      : null;

  const socialLinks = [
    barber.instagram_handle && {
      label: "Instagram",
      href: `https://instagram.com/${barber.instagram_handle.replace("@", "")}`,
      Icon: Instagram,
    },
    barber.tiktok_handle && {
      label: "TikTok",
      href: `https://tiktok.com/@${barber.tiktok_handle.replace("@", "")}`,
      Icon: Music2,
    },
    barber.youtube_channel && {
      label: "YouTube",
      href: `https://youtube.com/@${barber.youtube_channel.replace("@", "")}`,
      Icon: Youtube,
    },
    barber.website_url && {
      label: "Website",
      href: barber.website_url.startsWith("http") ? barber.website_url : `https://${barber.website_url}`,
      Icon: Globe,
    },
  ].filter(Boolean) as { label: string; href: string; Icon: any }[];

  const barberJsonLd = buildBarberJsonLd(barber);
  const barberFaqJsonLd = buildBarberFaqJsonLd(barber, services);

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(barberJsonLd) }} />
      {barberFaqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(barberFaqJsonLd) }} />}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <DynamicBackButton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Photo Gallery */}
            {heroPhoto ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                <a href={heroPhoto} target="_blank" rel="noopener noreferrer" className="block w-full aspect-[16/10] bg-slate-100 relative">
                  <Image src={heroPhoto} alt={barber.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" unoptimized={!heroPhoto.startsWith('https://')} />
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
                          <Image src={url} alt={`${barber.name} photo ${i + 2}`} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="16vw" unoptimized={!url.startsWith('https://')} />
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
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-600 to-slate-800 aspect-[16/7] flex items-center justify-center">
                <Users className="w-16 h-16 text-white/40" />
              </div>
            )}

            {/* Header Block */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{barber.name}</h1>
              {barber.address && (
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {barber.address}
                </p>
              )}
              {barber.school_district_name && (
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" />
                  Located in {barber.school_district_name}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {barber.booksy_rating && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-900">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    {Number(barber.booksy_rating).toFixed(1)}
                    {barber.booksy_review_count ? (
                      <span className="text-slate-500 font-medium underline decoration-slate-300 underline-offset-2">
                        {barber.booksy_review_count} reviews
                      </span>
                    ) : null}
                  </span>
                )}
                {barber.booksy_price_range && (
                  <span className="inline-flex items-center text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1">
                    {barber.booksy_price_range}
                  </span>
                )}
                {isLooking && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Actively Looking For Placement
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 font-medium mt-3">
                <span className="flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5" />
                  {barber.specialty_type || "Professional Barber"}
                </span>
                {barber.metro_area && (
                  <>
                    <span className="opacity-40">·</span>
                    <span>{barber.metro_area}</span>
                  </>
                )}
              </div>

              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {specialties.map((s) => (
                    <span key={s} className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
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
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
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
                      <span className="text-sm font-semibold text-slate-800">{service.name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-black text-slate-900">{formatPrice(service.price, service.currency)}</span>
                        {barber.profile_url && (
                          <a
                            href={barber.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-extrabold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition-colors"
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
                  {barber.profile_url ? (
                    <a href={barber.profile_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">
                      view current pricing on Booksy
                    </a>
                  ) : (
                    "check back soon"
                  )}
                  .
                </p>
              )}
            </div>

            {/* Credentials */}
            {(barber.school_name || barber.licensure_status || barber.completed_school_hours) && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                <h2 className="text-lg font-black text-slate-900 mb-4">Credentials</h2>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4.5 h-4.5 text-slate-500" />
                  </div>
                  <div>
                    {barber.school_name && <p className="text-sm font-bold text-slate-900">{barber.school_name}</p>}
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {[
                        barber.licensure_status,
                        barber.completed_school_hours ? `${barber.completed_school_hours} hours completed` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {barber.profile_url && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <a
                  href={barber.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
                >
                  Book on Booksy
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
                subtext="Get discovered by shops looking to hire"
                className="w-full inline-flex flex-col items-center justify-center gap-1 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-md shadow-indigo-600/20"
              />
            </div>

            {directionsHref && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Location</h3>
                <p className="text-sm text-slate-600 font-medium mb-3">{barber.address || barber.metro_area}</p>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:underline"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </a>
              </div>
            )}

            {hours.length > 0 && hours.some((h) => h.ranges.length > 0) && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Business Hours
                </h3>
                <ul className="space-y-1.5">
                  {hours.map((h, i) => (
                    <li
                      key={h.day}
                      className={`flex items-start justify-between gap-3 text-xs font-medium ${
                        i === TODAY_INDEX ? "text-slate-900 font-bold" : "text-slate-500"
                      }`}
                    >
                      <span>{h.day}</span>
                      <span className="text-right">
                        {h.ranges.length > 0 ? h.ranges.join(", ") : "Closed"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-8">
          <BackToSearchLink
            fallbackHref="/tools/barbershop-search"
            className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
