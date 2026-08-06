import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { Navbar } from "@/components/layout/navbar";
import { NearbyEntitiesSection } from "@/components/shared/nearby-entities-section";
import { fetchNearbyEntities } from "@/lib/nearby-entities";
import { EVENT_PUBLIC_COLUMNS } from "@/lib/public-columns";
import { SearchVisibilityCard } from "@/components/shared/search-visibility-card";
import {
  MapPin,
  CalendarDays,
  Clock,
  Navigation,
  ExternalLink,
  Ticket,
  Tag,
  User,
  Scissors,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { ClaimShopButton } from "@/components/shared/claim-shop-button";
import { isEntityClaimed } from "@/lib/entity-claim";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_COLUMNS = EVENT_PUBLIC_COLUMNS.join(", ");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getEvent(param: string) {
  const { data: bySlug, error: slugErr } = await supabase
    .from("events")
    .select(PUBLIC_COLUMNS)
    .eq("slug", param)
    .single();
  if (!slugErr && bySlug) return bySlug as any;

  if (!UUID_RE.test(param)) return null;

  const { data: byId, error: idErr } = await supabase
    .from("events")
    .select(PUBLIC_COLUMNS)
    .eq("id", param)
    .single();
  if (idErr || !byId) return null;
  return { ...(byId as any), _resolvedByLegacyId: true };
}

function formatEventDate(dateStr: string, endDateStr: string | null): string {
  const start = new Date(dateStr + "T00:00:00");
  const startLabel = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  if (!endDateStr || endDateStr === dateStr) return startLabel;
  const end = new Date(endDateStr + "T00:00:00");
  const endLabel = end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} – ${endLabel}`;
}

function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const event = await getEvent(slug);
  if (!event) return { title: "Event Not Found" };

  const title = `${event.title}${event.city ? ` — ${event.city} Barber & Beauty Event` : ""}`;
  const description = event.description || `${event.title}${event.venue_name ? ` at ${event.venue_name}` : ""}${event.city ? ` in ${event.city}` : ""}.`;
  const year = event.event_date ? new Date(event.event_date + "T00:00:00").getFullYear() : undefined;

  const keywords = [
    event.title,
    `${event.title} tickets`,
    event.venue_name ? `${event.title} ${event.venue_name}` : null,
    event.city ? `${event.title} ${event.city}` : null,
    year ? `${event.title} ${year}` : null,
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `${SITE_URL}/events/${slug}` },
    openGraph: {
      title,
      description,
      images: event.image_url ? [event.image_url] : undefined,
    },
  };
}

// Parses price_info strings like "2594.29 USD" into schema.org's structured
// price/priceCurrency fields. Falls back to a free-text description when the
// shape doesn't match (e.g. "Free", "Contact organizer") rather than forcing
// a bad parse — Google's Event rich-result validator wants the structured
// fields when a real numeric price is available, but a wrong guess is worse
// than no price field at all.
function parsePriceInfo(priceInfo: string | null): { price: string; priceCurrency: string } | null {
  if (!priceInfo) return null;
  const trimmed = priceInfo.trim();
  if (/^free$/i.test(trimmed)) return { price: "0", priceCurrency: "USD" };
  const match = trimmed.match(/^([\d,]+(?:\.\d{1,2})?)\s*([A-Z]{3})$/);
  if (!match) return null;
  return { price: match[1].replace(/,/g, ""), priceCurrency: match[2] };
}

// Ticketing platforms that host the listing but aren't the organizer's own
// site — attaching one of these to organizer.url would misattribute a
// third party's domain as belonging to the organizer.
const THIRD_PARTY_TICKETING_DOMAINS = ["eventbrite.com", "eventbrite.co.uk", "ticketmaster.com", "eventful.com"];

function isThirdPartyTicketingUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return THIRD_PARTY_TICKETING_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// Event — only 3 rows exist today, but the same page file is already being
// touched for the slug rename, so this ships correct from day one rather
// than needing a second pass once the events table grows.
function buildEventJsonLd(event: any, isPast: boolean) {
  const ld: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.start_time ? `${event.event_date}T${event.start_time}` : event.event_date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  };
  if (event.end_date || event.end_time) {
    ld.endDate = event.end_time ? `${event.end_date || event.event_date}T${event.end_time}` : event.end_date;
  }
  if (event.description) ld.description = event.description;
  if (event.venue_name || event.address) {
    ld.location = {
      "@type": "Place",
      name: event.venue_name || event.city,
      address: event.address
        ? {
            "@type": "PostalAddress",
            streetAddress: event.address,
            addressLocality: event.city || undefined,
            addressRegion: "TX",
            addressCountry: "US",
          }
        : undefined,
    };
  }
  if (event.organizer_name) {
    const organizer: Record<string, any> = { "@type": "Organization", name: event.organizer_name };
    // Only attribute a URL to the organizer when the event's own link isn't
    // a third-party ticketing platform — see isThirdPartyTicketingUrl above.
    const ownSiteUrl = event.source_url || event.ticket_url;
    if (ownSiteUrl && !isThirdPartyTicketingUrl(ownSiteUrl)) organizer.url = ownSiteUrl;
    ld.organizer = organizer;
  }
  if (event.image_url) ld.image = event.image_url;
  if (event.ticket_url || event.source_url) ld.url = event.ticket_url || event.source_url;

  // Google's Event guidelines say to omit "offers" entirely when the real
  // price isn't known, rather than publish an incomplete Offer — the ticket
  // link is still shown to visitors on the page regardless of this markup.
  const parsedPrice = parsePriceInfo(event.price_info);
  if (event.ticket_url && parsedPrice) {
    ld.offers = {
      "@type": "Offer",
      url: event.ticket_url,
      availability: isPast ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      validFrom: event.created_at ? String(event.created_at).slice(0, 10) : undefined,
      ...parsedPrice,
    };
  }
  return ld;
}

function buildEventBreadcrumbJsonLd(event: any) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Events", item: `${SITE_URL}/events` },
      { "@type": "ListItem", position: 3, name: event.title, item: `${SITE_URL}/events/${event.slug}` },
    ],
  };
}

// Only asks questions the real submitted data can actually answer — no
// fabricated schedule/vendor/speaker details invented to pad content.
function buildEventFaqs(event: any, dateLabel: string, startTimeLabel: string | null): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];

  faqs.push({
    question: `When is ${event.title}?`,
    answer: startTimeLabel ? `${dateLabel}, starting at ${startTimeLabel}.` : dateLabel,
  });

  if (event.venue_name || event.address) {
    faqs.push({
      question: `Where is ${event.title} held?`,
      answer: `${event.venue_name || "The venue"}${event.address ? `, ${event.address}` : event.city ? ` in ${event.city}` : ""}.`,
    });
  }

  if (event.price_info) {
    faqs.push({
      question: `How much are tickets to ${event.title}?`,
      answer: `${event.price_info}${event.ticket_url ? " — see the official ticket link on this page for current pricing and availability." : "."}`,
    });
  } else if (event.ticket_url) {
    faqs.push({
      question: `How do I get tickets to ${event.title}?`,
      answer: `Tickets are available through the official ticket link on this page.`,
    });
  }

  if (event.organizer_name) {
    faqs.push({
      question: `Who is organizing ${event.title}?`,
      answer: `${event.title} is organized by ${event.organizer_name}.`,
    });
  }

  if (event.end_date && event.end_date !== event.event_date) {
    faqs.push({
      question: `Is ${event.title} a multi-day event?`,
      answer: `Yes — it runs ${dateLabel}.`,
    });
  }

  return faqs;
}

export default async function EventProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const event = await getEvent(slug);

  if (!event) notFound();
  if (event._resolvedByLegacyId) permanentRedirect(`/events/${event.slug}`);

  const isClaimed = await isEntityClaimed("event", event.id);

  const isPast = new Date(event.event_date + "T23:59:59") < new Date();
  const dateLabel = formatEventDate(event.event_date, event.end_date);
  const startTimeLabel = formatTime(event.start_time);
  const endTimeLabel = formatTime(event.end_time);

  const directionsHref =
    event.latitude && event.longitude
      ? `https://www.google.com/maps?q=${event.latitude},${event.longitude}`
      : event.address
      ? `https://www.google.com/maps?q=${encodeURIComponent(event.address)}`
      : null;

  const eventCenter =
    event.latitude && event.longitude ? { lat: Number(event.latitude), lng: Number(event.longitude) } : null;
  const [nearbyShopsForAttendees, nearbySalonsForAttendees] = eventCenter
    ? await Promise.all([
        fetchNearbyEntities(supabase, "shops", eventCenter, { limit: 5 }),
        fetchNearbyEntities(supabase, "salons", eventCenter, { limit: 5 }),
      ])
    : [[], []];

  const eventJsonLd = buildEventJsonLd(event, isPast);
  const breadcrumbJsonLd = buildEventBreadcrumbJsonLd(event);
  const faqs = buildEventFaqs(event, dateLabel, startTimeLabel);
  const faqJsonLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  } : null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: searchPerfRows } = await supabase.rpc('get_search_performance_by_entity', {
    p_entity_id: event.id,
    p_result_type: 'event',
    p_cutoff: thirtyDaysAgo,
  });
  const searchPerformance = (searchPerfRows && searchPerfRows[0]) || null;

  return (
    <div className="min-h-screen light bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-6">
        <DynamicBackButton fallbackHref="/events" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hero image */}
            {event.image_url ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                <div className="block w-full aspect-[16/10] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-600 to-slate-800 aspect-[16/7] flex items-center justify-center">
                <CalendarDays className="w-16 h-16 text-white/40" />
              </div>
            )}

            {/* Header Block */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {event.category && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
                    <Tag className="w-3 h-3" />
                    {event.category}
                  </span>
                )}
                {isPast && (
                  <span className="inline-flex items-center text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1">
                    Past Event
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{event.title}</h1>
              {isClaimed ? (
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg font-bold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                  </span>
                </div>
              ) : (
                <ClaimShopButton entityType="event" entityId={event.id} entityName={event.title} noun="event" />
              )}

              <p className="text-sm text-slate-700 font-bold mt-2 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                {dateLabel}
              </p>
              {(startTimeLabel || endTimeLabel) && (
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {startTimeLabel}{endTimeLabel ? ` – ${endTimeLabel}` : ""}
                </p>
              )}
              {(event.venue_name || event.address) && (
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {event.venue_name}{event.venue_name && event.address ? " — " : ""}{event.address}
                </p>
              )}
              {event.organizer_name && (
                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Organized by {event.organizer_name}
                </p>
              )}
            </div>

            {/* About */}
            {event.description && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                <h2 className="text-lg font-black text-slate-900 mb-3">About this event</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* What to Expect — only real, submitted facts, no invented programming details */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <h2 className="text-lg font-black text-slate-900 mb-3">What to Expect</h2>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{dateLabel}{startTimeLabel ? `, starting at ${startTimeLabel}` : ""}{isPast ? " (this event has already taken place)" : ""}.</span>
                </li>
                {event.category && (
                  <li className="flex items-start gap-2">
                    <Tag className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Listed as a {event.category.toLowerCase()} event.</span>
                  </li>
                )}
                {event.organizer_name && (
                  <li className="flex items-start gap-2">
                    <User className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>Organized by {event.organizer_name}.</span>
                  </li>
                )}
                {event.ticket_url && (
                  <li className="flex items-start gap-2">
                    <Ticket className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{event.price_info ? `Tickets: ${event.price_info}.` : "Ticket details available via the official link."}</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Getting There */}
            {(event.venue_name || event.address) && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                <h2 className="text-lg font-black text-slate-900 mb-3">Getting There</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {event.title} is held at {event.venue_name || "the venue"}
                  {event.address ? `, ${event.address}` : event.city ? ` in ${event.city}` : ""}.
                  {directionsHref ? " Use the directions link in the sidebar for turn-by-turn navigation." : ""}
                </p>
              </div>
            )}

            {/* FAQ */}
            {faqs.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                <h2 className="text-lg font-black text-slate-900 mb-4">Common Questions</h2>
                <div className="space-y-4">
                  {faqs.map((faq) => (
                    <div key={faq.question}>
                      <h3 className="text-sm font-black text-slate-900 mb-1">{faq.question}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <SearchVisibilityCard searchPerformance={searchPerformance} isClaimed={isClaimed} entityLabel="event" />

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
              {event.ticket_url && (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ig-click="outbound_lead"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider transition-colors shadow-md shadow-indigo-600/20"
                >
                  <Ticket className="w-4 h-4" />
                  Get Tickets
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {event.source_url && (
                <a
                  href={event.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ig-click="outbound_lead"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-extrabold text-sm uppercase tracking-wider transition-colors"
                >
                  View Original Listing
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {event.price_info && (
                <p className="text-center text-sm font-bold text-slate-700 pt-1">{event.price_info}</p>
              )}
            </div>

            {directionsHref && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">Location</h3>
                <p className="text-sm text-slate-600 font-medium mb-3">{event.venue_name}{event.venue_name && event.address ? " — " : ""}{event.address || event.city}</p>
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

            <NearbyEntitiesSection title="Get Ready: Shops Near the Venue" icon={Scissors} entities={nearbyShopsForAttendees} />
            <NearbyEntitiesSection title="Salons Near the Venue" icon={Sparkles} entities={nearbySalonsForAttendees} />
          </div>
        </div>

        <div className="text-center mt-8">
          <BackToSearchLink
            fallbackHref="/tools/barbershop-search?tab=Events"
            className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
