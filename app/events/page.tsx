import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, Compass } from "lucide-react";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";
import { Navbar } from "@/components/layout/navbar";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const metadata: Metadata = {
  title: "Texas Barber & Cosmetology Industry Events | Inner G Complete",
  description: "Upcoming and past barber battles, cosmetology expos, trade shows, and industry events across Texas.",
  alternates: { canonical: "https://agency.innergcomplete.com/events" },
};

function formatEventDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// The internal-linking hub every /events/[slug] page was missing — without
// this, individual event pages were only reachable via sitemap/search, with
// no site-wide link pointing Google (or a visitor) at them at all. Scales
// automatically as more events get submitted, unlike a hardcoded footer list.
//
// Same "container" pattern as the city hub pages' service-link sections
// (see components/city-hub/CityHubDirectory.tsx / app/houston/
// HoustonDirectory.tsx) — one statewide container plus one per city with
// real upcoming events, populated with actual event data instead of static
// links. Grouping is purely presentational (real event_date/city columns,
// same rows as before) — no new data source.
export default async function EventsIndexPage() {
  const { data: events } = await supabase
    .from("events")
    .select("slug, title, event_date, end_date, venue_name, city, category, image_url")
    .order("event_date", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (events || []).filter((e) => e.event_date >= today);
  const past = (events || []).filter((e) => e.event_date < today).reverse();

  const cityGroups = new Map<string, any[]>();
  for (const event of upcoming) {
    const city = event.city || "Other";
    if (!cityGroups.has(city)) cityGroups.set(city, []);
    cityGroups.get(city)!.push(event);
  }
  const sortedCities = [...cityGroups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-6">
        <DynamicBackButton fallbackHref="/" />

        <div className="text-center mb-10 mt-4">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 mb-3">
            Texas Barber &amp; Cosmetology Industry Events
          </h1>
          <p className="text-slate-600 text-base leading-relaxed max-w-xl mx-auto">
            Barber battles, cosmetology expos, trade shows, and industry events across Texas.
          </p>
          <Link
            href="/tools/event-submission"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:underline mt-3"
          >
            Submit your event →
          </Link>
        </div>

        {upcoming.length > 0 && (
          <div className="space-y-6 mb-12">
            {/* Statewide container — every upcoming event across Texas */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <div className="flex items-center gap-2 mb-1">
                <Compass className="w-5 h-5 text-slate-700" />
                <h2 className="text-lg font-black text-slate-900">Texas Events</h2>
                <span className="text-sm font-bold text-slate-400">({upcoming.length})</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Every upcoming event across the state, soonest first.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcoming.map((event) => (
                  <EventGridCard key={event.slug} event={event} />
                ))}
              </div>
            </div>

            {/* Per-city containers — same event rows, grouped by city */}
            {sortedCities.map(([city, cityEvents]) => (
              <div key={city} className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-5 h-5 text-slate-700" />
                  <h2 className="text-lg font-black text-slate-900">{city} Events</h2>
                  <span className="text-sm font-bold text-slate-400">({cityEvents.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {cityEvents.map((event) => (
                    <EventGridCard key={event.slug} event={event} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Past Events</h2>
            <div className="space-y-3">
              {past.map((event) => (
                <EventCard key={event.slug} event={event} isPast />
              ))}
            </div>
          </section>
        )}

        {(!events || events.length === 0) && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-500">
              No events listed yet.{" "}
              <Link href="/tools/event-submission" className="text-indigo-600 font-bold hover:underline">
                Submit the first one
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Grid-card version for the statewide/per-city containers — matches the
// same "solid card" convention as the city hub sections' item cards.
function EventGridCard({ event }: { event: any }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors p-4 block"
    >
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
          <CalendarDays className="w-3 h-3" />
          {formatEventDate(event.event_date)}
        </span>
        {event.category && (
          <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
            {event.category}
          </span>
        )}
      </div>
      <p className="font-bold text-slate-900 text-sm truncate">{event.title}</p>
      {(event.venue_name || event.city) && (
        <p className="text-xs text-slate-500 font-medium mt-1 truncate">
          {event.venue_name}
          {event.venue_name && event.city ? " — " : ""}
          {event.city}
        </p>
      )}
    </Link>
  );
}

function EventCard({ event, isPast }: { event: any; isPast?: boolean }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className={`block bg-white border border-slate-200 rounded-2xl shadow-sm p-5 hover:border-indigo-300 transition-colors ${isPast ? "opacity-70" : ""}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5 inline-flex items-center gap-1">
          <CalendarDays className="w-3 h-3" />
          {formatEventDate(event.event_date)}
        </span>
        {event.category && (
          <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
            {event.category}
          </span>
        )}
      </div>
      <h3 className="text-base font-black text-slate-900">{event.title}</h3>
      {(event.venue_name || event.city) && (
        <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          {event.venue_name}
          {event.venue_name && event.city ? " — " : ""}
          {event.city}
        </p>
      )}
    </Link>
  );
}
