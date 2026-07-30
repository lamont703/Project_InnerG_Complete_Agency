import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { Navbar } from "@/components/layout/navbar";
import { EntityPhotoGallery } from "@/components/shared/entity-photo-gallery";
import { NearbyEntitiesSection } from "@/components/shared/nearby-entities-section";
import { fetchNearbyEntities } from "@/lib/nearby-entities";
import { buildEntityBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { COSMETOLOGIST_PUBLIC_COLUMNS } from "@/lib/public-columns";
import { SearchVisibilityCard } from "@/components/shared/search-visibility-card";
import Image from "next/image";
import {
  MapPin,
  Star,
  Sparkles,
  Instagram,
  Youtube,
  Globe,
  Music2,
  Users,
  Navigation,
  Landmark,
  GraduationCap,
  CheckCircle2,
  CalendarCheck,
  Phone,
  Clock,
} from "lucide-react";
import { ClaimShopButton } from "@/components/shared/claim-shop-button";
import { isEntityClaimed } from "@/lib/entity-claim";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_COLUMNS = COSMETOLOGIST_PUBLIC_COLUMNS.join(", ");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 0 = Monday, matching the day order Booksy returns. Same definition as
// app/barbers/[slug]/page.tsx.
const TODAY_INDEX = (new Date().getDay() + 6) % 7;

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

// specialty_type is populated on 0 of 122 cosmetologist rows, and
// metro_area is "Houston" on all 122 (a real, single-metro dataset, not a
// bug) — so every title used to render as the exact same generic
// "{name} — Beauty Professional in Houston". The role is almost always
// already sitting right in the Booksy-sourced name itself (e.g. "Nicole
// English Cosmetologist", "Ashia Brown Stylist") — it just never got
// split out into specialty_type at ingestion. Extracting it here gives
// titles real variation (Cosmetologist / Esthetician / Stylist / Makeup
// Artist / Nail Technician) instead of one identical filler phrase
// repeated 122 times.
const KNOWN_BEAUTY_ROLES = [
  "Makeup Artist",
  "Nail Technician",
  "Hair Stylist",
  "Lash Artist",
  "Cosmetologist",
  "Esthetician",
  "Stylist",
  "Colorist",
  "Braider",
  "Barber",
];

function extractRoleFromName(name?: string | null): string | null {
  if (!name) return null;
  const cleaned = name.replace(/["""'']/g, "").trim();
  for (const role of KNOWN_BEAUTY_ROLES) {
    if (new RegExp(`\\b${role}$`, "i").test(cleaned)) return role;
  }
  return null;
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const person = await getCosmetologist(slug);
  if (!person) return { title: "Cosmetologist Profile Not Found" };

  const role = person.specialty_type || extractRoleFromName(person.name) || "Beauty Professional";
  const title = `${person.name} — ${role}${person.metro_area ? ` in ${person.metro_area}` : ""}`;
  const descParts = [
    person.name,
    role,
    person.metro_area ? `in ${person.metro_area}` : null,
    person.booksy_rating ? `Rated ${Number(person.booksy_rating).toFixed(1)}★` : null,
    person.booksy_review_count ? `(${person.booksy_review_count} reviews)` : null,
    person.booksy_price_range || null,
  ].filter(Boolean);
  const description = `${descParts.join('. ')}. View gallery, services, and book online.`;
  const heroImage = person.portfolio_images?.[0] || person.booksy_gallery_urls?.[0] || person.booksy_photo_url;

  return {
    title,
    description,
    alternates: { canonical: `https://agency.innergcomplete.com/cosmetologists/${slug}` },
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
    jobTitle: person.specialty_type || extractRoleFromName(person.name) || "Cosmetologist",
  };
  if (person.address) ld.address = { "@type": "PostalAddress", streetAddress: person.address, addressRegion: "TX", addressCountry: "US" };
  if (person.metro_area) ld.homeLocation = { "@type": "Place", name: person.metro_area };
  if (person.latitude && person.longitude) ld.geo = { "@type": "GeoCoordinates", latitude: person.latitude, longitude: person.longitude };
  if (person.website_url) ld.url = person.website_url.startsWith("http") ? person.website_url : `https://${person.website_url}`;
  // No aggregateRating here on purpose: Google's review-snippet rich result
  // doesn't support Person as the reviewed entity, so this used to generate
  // "Invalid object type" errors in Search Console with no upside — the
  // rating still displays visually on the page, just not in structured data.
  const heroImg = person.portfolio_images?.[0] || person.booksy_gallery_urls?.[0] || person.booksy_photo_url;
  if (heroImg) ld.image = heroImg;
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

  const isClaimed = await isEntityClaimed("cosmetologist", person.id);

  // Owner-uploaded work leads, same reasoning as the barber page.
  const ownerPhotos: string[] = Array.isArray(person.portfolio_images) ? person.portfolio_images : [];
  const booksyPhotos: string[] = Array.isArray(person.booksy_gallery_urls) ? person.booksy_gallery_urls : [];
  const gallery: string[] = [...ownerPhotos, ...booksyPhotos];
  const heroPhoto = gallery[0] || person.booksy_photo_url || null;
  const thumbnails = gallery.slice(1, 7);
  const remainingCount = Math.max(0, gallery.length - 1 - thumbnails.length);

  const services: { name: string; price: number; duration?: string }[] = Array.isArray(person.booksy_services)
    ? person.booksy_services
    : [];
  // booksy_hours is currently populated on 0 of 122 cosmetologist rows — the
  // StyleSeat scrape doesn't capture it the way the Booksy barber scrape does.
  // Wired anyway so the section appears the moment that changes, and renders
  // nothing until then rather than an empty card.
  const hours: { day: string; ranges: string[] }[] = Array.isArray(person.booksy_hours) ? person.booksy_hours : [];

  const specialties: string[] = (person.desired_specialties || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  const role = person.specialty_type || extractRoleFromName(person.name) || "Beauty Professional";

  const directionsHref =
    person.latitude && person.longitude
      ? `https://www.google.com/maps?q=${person.latitude},${person.longitude}`
      : person.address
      ? `https://www.google.com/maps?q=${encodeURIComponent(person.address)}`
      : null;

  const cosmetCenter =
    person.latitude && person.longitude ? { lat: Number(person.latitude), lng: Number(person.longitude) } : null;
  const [nearbySalons, nearbyCosmetSchools] = cosmetCenter
    ? await Promise.all([
        fetchNearbyEntities(supabase, "salons", cosmetCenter, { limit: 5 }),
        fetchNearbyEntities(supabase, "cosmetologySchools", cosmetCenter, { limit: 5 }),
      ])
    : [[], []];

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

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: searchPerfRows } = await supabase.rpc('get_search_performance_by_entity', {
    p_entity_id: person.id,
    p_result_type: 'cosmetologist',
    p_cutoff: thirtyDaysAgo,
  });
  const searchPerformance = (searchPerfRows && searchPerfRows[0]) || null;

  return (
    <div className="min-h-screen light bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cosmetologistJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildEntityBreadcrumbJsonLd("Cosmetologists", "/cosmetologists", person.name, person.slug)) }} />
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-6">
        <DynamicBackButton fallbackHref="/tools/barbershop-search?tab=Cosmetologist" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Photo Gallery */}
            <EntityPhotoGallery
              heroPhoto={heroPhoto}
              thumbnails={thumbnails}
              remainingCount={remainingCount}
              name={person.name}
              gridCols={6}
              accentFrom="from-fuchsia-600"
            />

            {/* Header Block */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{person.name}</h1>
              {isClaimed ? (
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg font-bold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                  </span>
                </div>
              ) : (
                <ClaimShopButton entityType="cosmetologist" entityId={person.id} entityName={person.name} noun="cosmetologist profile" />
              )}
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
                  {role}
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

              {/* Primary CTA row — mirrors app/barbers/[slug]. Booking is the
                  money action so it gets the filled button. Each is conditional:
                  profile_url and phone are 100% populated on this table,
                  website_url is populated on 0 of 122 rows, so the Website
                  button renders for nobody today but is wired for when it is. */}
              <div className="flex flex-wrap items-stretch gap-2 mt-5 pt-5 border-t border-slate-100">
                {person.profile_url && (
                  <a
                    href={person.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ig-click="outbound_lead"
                    className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-fuchsia-600/20"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    Book Now
                  </a>
                )}
                {person.phone && (
                  <a
                    href={`tel:${String(person.phone).replace(/[^\d+]/g, "")}`}
                    data-ig-click="outbound_lead"
                    className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-fuchsia-200 hover:bg-fuchsia-50 text-slate-700 hover:text-fuchsia-700 font-bold text-sm transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                )}
                {person.website_url && (
                  <a
                    href={person.website_url.startsWith("http") ? person.website_url : `https://${person.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ig-click="outbound_lead"
                    className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-fuchsia-200 hover:bg-fuchsia-50 text-slate-700 hover:text-fuchsia-700 font-bold text-sm transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
                {directionsHref && (
                  <a
                    href={directionsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ig-click="outbound_lead"
                    className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-fuchsia-200 hover:bg-fuchsia-50 text-slate-700 hover:text-fuchsia-700 font-bold text-sm transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    Directions
                  </a>
                )}
              </div>

              {socialLinks.length > 0 && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                  {socialLinks.map(({ label, href, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      data-ig-click={label === "Website" ? "outbound_lead" : undefined}
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
                            data-ig-click="outbound_lead"
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
                    <a href={person.profile_url} target="_blank" rel="noopener noreferrer" data-ig-click="outbound_lead" className="text-fuchsia-600 font-bold hover:underline">
                      view current pricing on StyleSeat
                    </a>
                  ) : (
                    "check back soon"
                  )}
                  .
                </p>
              )}
            </div>

            {/* Business Hours — directly after Services, matching
                app/barbers/[slug]. Renders only when real hours exist. */}
            {hours.length > 0 && hours.some((h) => h.ranges.length > 0) && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Business Hours
                </h2>
                <ul className="space-y-2">
                  {hours.map((h, i) => (
                    <li
                      key={h.day}
                      className={`flex items-start justify-between gap-3 text-sm ${
                        i === TODAY_INDEX ? "text-slate-900 font-black" : "text-slate-500 font-medium"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {h.day}
                        {i === TODAY_INDEX && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-100 rounded px-1.5 py-0.5">
                            Today
                          </span>
                        )}
                      </span>
                      <span className="text-right">
                        {h.ranges.length > 0 ? h.ranges.join(", ") : "Closed"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <SearchVisibilityCard searchPerformance={searchPerformance} isClaimed={isClaimed} entityLabel="cosmetologist" />

            {/* Book / Call / Website / Directions all moved into the header
                block above. Passport CTA removed per product direction — it
                belongs on recruiting surfaces, not a consumer-facing profile. */}
            {directionsHref && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Location</h3>
                <p className="text-sm text-slate-600 font-medium">{person.address || person.metro_area}</p>
              </div>
            )}

            <NearbyEntitiesSection title="Nearby Salons" icon={Sparkles} entities={nearbySalons} />
            <NearbyEntitiesSection title="Nearby Cosmetology Schools" icon={GraduationCap} entities={nearbyCosmetSchools} />
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
