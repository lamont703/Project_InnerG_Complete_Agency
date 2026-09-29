import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { CalendarCheck, Bot, QrCode } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { providerIdByHandle } from "@/lib/calendar/booking-handle";
import { bookableProvider } from "@/lib/calendar/client-booking";
import { BookPagePanel } from "@/components/booking/book-page-panel";

/**
 * A pro's "Book me" page (/book/<handle>): book right here, or from the
 * client's own AI assistant — Claude or ChatGPT — with no ShearQuery account,
 * proving their phone with a text code (lib/mcp/client-booking-tools.ts,
 * request_booking_code / book_as_guest). The QR code is for the mirror or the
 * front desk.
 *
 * Only for bookable calendars: in testing, the allowlist; once the calendar
 * opens, the Manage plan (lib/feature-access.ts). Personal to one pro, so
 * noindex and out of the sitemap (lib/public-routes.ts).
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params) {
  const { handle } = await params;
  const id = await providerIdByHandle(handle);
  const pro = id ? await bookableProvider(id) : null;
  return { title: pro ? `Book with ${pro.provider.display_name}` : "Book an appointment", robots: { index: false, follow: false } };
}

const price = (c: number | null) => (c == null ? "" : `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`);

export default async function BookPage({ params }: Params) {
  const { handle } = await params;
  const id = await providerIdByHandle(handle);
  if (!id) notFound();
  const pro = await bookableProvider(id);
  const url = `${SITE_URL}/book/${handle}`;

  if (!pro) {
    return (
      <div className="min-h-screen light bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-6">
          <h1 className="text-2xl font-black">Online booking isn&apos;t available right now</h1>
          <p className="mt-2 text-sm text-slate-600">This calendar isn&apos;t taking bookings through ShearQuery at the moment. Contact the shop directly to book.</p>
        </main>
      </div>
    );
  }

  const { provider, listing, services } = pro;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 360 });
  const phrase = `Book a ${services[0]?.name.toLowerCase() ?? "haircut"} with ${provider.display_name} on ShearQuery — booking handle ${handle}.`;

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20 sm:px-6">
        <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight"><CalendarCheck className="h-7 w-7" /> Book with {provider.display_name}</h1>
        {listing && <p className="mt-1 text-sm text-slate-600">at {listing}</p>}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Services</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {services.map((s) => (
              <li key={s.id} className="flex justify-between py-2"><span className="font-bold">{s.name}</span><span className="text-slate-600">{s.duration_minutes} min{s.price_cents != null ? ` · ${price(s.price_cents)}` : ""}</span></li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Book here</h2>
          <div className="mt-4">
            <BookPagePanel
              info={{
                providerId: provider.id,
                name: provider.display_name,
                listing,
                timezone: provider.timezone,
                windowDays: provider.booking_window_days,
                services: services.map((s) => ({ id: s.id, name: s.name, minutes: s.duration_minutes, priceCents: s.price_cents })),
              }}
            />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500"><Bot className="h-4 w-4" /> Or book from your AI</h2>
          <p className="mt-2 text-sm text-slate-600">Ask your own AI assistant to book it. You don&apos;t need a ShearQuery account — it texts you a code to confirm your number.</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li><strong>Claude:</strong> Settings → Connectors → Add custom connector, and paste <code className="rounded bg-slate-100 px-1">{SITE_URL}/mcp</code>.</li>
            <li><strong>ChatGPT:</strong> Settings → Apps → Advanced settings, turn on Developer mode, then add a connector with the same address.</li>
            <li>Then say: <span className="font-bold">&ldquo;{phrase}&rdquo;</span></li>
          </ol>
          <p className="mt-2 text-xs text-slate-500">Adding a connector needs a paid Claude or ChatGPT plan.</p>
        </section>

        <section className="mt-4 flex flex-wrap items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code for ${url}`} width={144} height={144} className="rounded-lg border border-slate-100" />
          <div className="text-sm">
            <p className="flex items-center gap-2 font-bold"><QrCode className="h-4 w-4" /> Scan to book</p>
            <p className="mt-1 break-all text-slate-600">{url}</p>
          </div>
        </section>
      </main>
    </div>
  );
}
