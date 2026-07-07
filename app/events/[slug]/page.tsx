import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { BackToSearchLink } from "@/components/shared/back-to-search-link";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import {
  MapPin,
  CalendarDays,
  Clock,
  Navigation,
  ExternalLink,
  Ticket,
  Tag,
  User,
} from "lucide-react";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PUBLIC_COLUMNS = [
  "id",
  "slug",
  "title",
  "description",
  "event_date",
  "end_date",
  "start_time",
  "end_time",
  "venue_name",
  "address",
  "city",
  "latitude",
  "longitude",
  "category",
  "organizer_name",
  "ticket_url",
  "source_url",
  "image_url",
  "price_info",
].join(", ");

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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: event.image_url ? [event.image_url] : undefined,
    },
  };
}

// Event — only 3 rows exist today, but the same page file is already being
// touched for the slug rename, so this ships correct from day one rather
// than needing a second pass once the events table grows.
function buildEventJsonLd(event: any) {
  const ld: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.start_time ? `${event.event_date}T${event.start_time}` : event.event_date,
  };
  if (event.end_date || event.end_time) {
    ld.endDate = event.end_time ? `${event.end_date || event.event_date}T${event.end_time}` : event.end_date;
  }
  if (event.description) ld.description = event.description;
  if (event.venue_name || event.address) {
    ld.location = {
      "@type": "Place",
      name: event.venue_name || event.city,
      address: event.address ? { "@type": "PostalAddress", streetAddress: event.address, addressRegion: "TX", addressCountry: "US" } : undefined,
    };
  }
  if (event.organizer_name) ld.organizer = { "@type": "Organization", name: event.organizer_name };
  if (event.image_url) ld.image = event.image_url;
  if (event.ticket_url || event.price_info) {
    ld.offers = {
      "@type": "Offer",
      url: event.ticket_url || undefined,
      description: event.price_info || undefined,
    };
  }
  return ld;
}

export default async function EventProfilePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const event = await getEvent(slug);

  if (!event) notFound();
  if (event._resolvedByLegacyId) permanentRedirect(`/events/${event.slug}`);

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

  const eventJsonLd = buildEventJsonLd(event);

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <DynamicBackButton />
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
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-3">
              {event.ticket_url && (
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
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
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:underline"
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
            fallbackHref="/tools/barbershop-search?tab=Events"
            className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
