import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Lock, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/site";
import { ensureBookingHandle } from "@/lib/calendar/booking-handle";
import { CopyField } from "@/components/account/copy-field";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCalendarAccess } from "@/lib/feature-access";
import { getProvider, getHours, listServices, listAppointments } from "@/lib/calendar/store";
import { formatLocal, minuteToClock, localDateKey } from "@/lib/calendar/time";

/**
 * The ShearQuery calendar, as a page. Read-only on purpose: the book is managed
 * from Claude (lib/mcp/calendar-tools.ts), and this is where the owner checks
 * what Claude did. Private testing — lib/calendar/access.ts.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar | ShearQuery",
  robots: { index: false, follow: false },
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function CalendarPage() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login?redirect=/account/calendar");
    return null;
  }
  const { data: member } = await (createAdminClient().from("community_members") as any)
    .select("email").eq("id", ctx.memberId).maybeSingle();
  const allowed = await hasCalendarAccess(member?.email);
  const provider = allowed ? await getProvider(ctx.memberId) : null;

  let body: React.ReactNode;
  if (!allowed) {
    body = (
      <div className="mt-8 flex gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>The ShearQuery calendar is in private testing. It opens to every pro once it has been tested.</span>
      </div>
    );
  } else if (!provider) {
    body = (
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-700 shadow-sm">
        <p className="font-black">Set it up from Claude.</p>
        <p className="mt-2">
          With ShearQuery connected in Claude, say something like{" "}
          <em>&quot;Set my hours to Tuesday through Saturday, 9am to 6pm, and add a fade for $35, 45 minutes.&quot;</em>{" "}
          Your calendar appears here as soon as it exists.
        </p>
        <Link href="/account/claude" className="mt-4 inline-block font-bold text-blue-700 underline">Connect Claude</Link>
      </section>
    );
  } else {
    const now = new Date();
    const [hours, services, appts] = await Promise.all([
      getHours(provider.id),
      listServices(provider.id),
      listAppointments(provider.id, now, new Date(now.getTime() + 7 * 86400_000)),
    ]);
    const tz = provider.timezone;
    const days = new Map<string, typeof appts>();
    for (const a of appts) {
      const k = localDateKey(new Date(a.starts_at), tz);
      days.set(k, [...(days.get(k) || []), a]);
    }
    const handle = provider.is_demo ? null : await ensureBookingHandle(provider.id);
    const bookUrl = handle ? `${SITE_URL}/book/${handle}` : null;
    const qr = bookUrl ? await QRCode.toDataURL(bookUrl, { margin: 1, width: 480 }) : null;
    body = (
      <div className="mt-8 space-y-6">
        {bookUrl && qr && (
          <section className="rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500"><QrCode className="h-4 w-4" /> Let clients book you — here or from their AI</h2>
            <p className="mt-2 text-sm text-slate-600">
              Share your booking page, or print the QR code for your mirror or front desk. Clients can book on the page, or tell their own Claude or ChatGPT
              &ldquo;book with {provider.display_name} on ShearQuery, booking handle {handle}&rdquo; — no ShearQuery account needed, just a text code to confirm their number.
            </p>
            <div className="mt-4 flex flex-wrap items-start gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR code for ${bookUrl}`} width={160} height={160} className="rounded-lg border border-slate-100" />
              <div className="min-w-[240px] flex-1 space-y-3">
                <CopyField label="Booking page" value={bookUrl} />
                <CopyField label="For your clients' AI" value={`Book with ${provider.display_name} on ShearQuery, booking handle ${handle}`} />
                <a href={qr} download={`shearquery-booking-${handle}.png`} className="inline-block text-xs font-bold text-blue-700 underline">Download the QR code</a>
              </div>
            </div>
          </section>
        )}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Next 7 days</h2>
          {appts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No appointments. Ask Claude to book one.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {[...days].map(([k, list]) => (
                <div key={k}>
                  <p className="text-sm font-black">{formatLocal(new Date(list[0].starts_at), tz).split(",")[0]}</p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {list.map((a) => (
                      <li key={a.id} className={a.status === "no_show" ? "text-slate-400 line-through" : ""}>
                        {formatLocal(new Date(a.starts_at), tz, false)}–{formatLocal(new Date(a.ends_at), tz, false)} · {a.service_name}
                        {a.client ? ` · ${a.client.name}` : ""}
                        {a.status !== "booked" ? ` · ${a.status.replace("_", "-")}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Hours ({tz})</h2>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                const t = hours.filter((h) => h.weekday === wd);
                return (
                  <li key={wd}>
                    <span className="inline-block w-24 font-semibold">{DAY_NAMES[wd]}</span>
                    {t.length ? t.map((h) => `${minuteToClock(h.start_minute)}–${minuteToClock(h.end_minute)}`).join(", ") : "closed"}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Services</h2>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {services.length === 0 ? <li>None yet.</li> : services.map((s) => (
                <li key={s.id}>
                  {s.name} · {s.duration_minutes} min{s.price_cents != null ? ` · $${(s.price_cents / 100).toFixed(s.price_cents % 100 ? 2 : 0)}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <p className="text-xs text-slate-500">Change anything by asking Claude. Clients can&apos;t book themselves yet — that comes next.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500">
          <Link href="/account/claude" className="hover:text-primary">Claude</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-700">Calendar</span>
        </nav>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
          <CalendarDays className="h-6 w-6" /> Your appointment book
        </h1>
        <p className="mt-3 leading-relaxed text-slate-600">
          Run your book from Claude: &quot;what does tomorrow look like?&quot;, &quot;book Marcus a fade Friday at 3&quot;,
          &quot;move my 2 o&apos;clock to 4&quot;, &quot;block off next Monday&quot;. This page shows what&apos;s on it.
        </p>
        {body}
      </main>
    </div>
  );
}
