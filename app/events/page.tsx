import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const metadata: Metadata = {
  title: "Texas Barber & Cosmetology Industry Events | Inner G Complete",
  description: "Upcoming and past barber battles, cosmetology expos, trade shows, and industry events across Texas.",
  alternates: { canonical: "https://innergcomplete.com/events" },
};

function formatEventDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// The internal-linking hub every /events/[slug] page was missing — without
// this, individual event pages were only reachable via sitemap/search, with
// no site-wide link pointing Google (or a visitor) at them at all. Scales
// automatically as more events get submitted, unlike a hardcoded footer list.
export default async function EventsIndexPage() {
  const { data: events } = await supabase
    .from("events")
    .select("slug, title, event_date, end_date, venue_name, city, category, image_url")
    .order("event_date", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (events || []).filter((e) => e.event_date >= today);
  const past = (events || []).filter((e) => e.event_date < today).reverse();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
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
          <section className="mb-12">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Upcoming</h2>
            <div className="space-y-3">
              {upcoming.map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
          </section>
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
