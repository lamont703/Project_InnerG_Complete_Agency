import type { Metadata } from "next";
import Link from "next/link";
import { Bot, CalendarClock, Gift, Link2, MicOff, Radio, Sparkles, TrendingUp, VideoOff } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { SIGNUP_AUDIENCES } from "@/lib/audiences";
import { EVENT_HOST, EVENT_NAME, registrationClosesAt, sessionForRegistration, sessionLabel, sessionStart, EVENT_LENGTH_MIN } from "@/lib/live-training/schedule";
import { SMS_CONSENT_TEXT } from "@/lib/live-training/store";
import { RegisterForm } from "@/components/live-training/register-form";

/**
 * THE LIVE TRAINING REGISTRATION PAGE — /live-training. Its own page so ads
 * (Instagram) and the member email campaign can point straight at it; /links
 * links here too.
 *
 * Always shows the session a sign-up right now would be for: this Monday
 * while registration is open, the next one once it has closed (Saturday 3 PM
 * ET) — lib/live-training/schedule.ts.
 *
 * ?src= (or utm_source) is recorded with the registration, so we can see which
 * ads and which campaign week bring people in. ?via=<CODE> is an agency's
 * referral code (from shearquery.com/live/<CODE>): the registration is
 * credited to that agency, and so is the account if they sign up later.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LIVE AI Barber Beauty Business Training — Free, Mondays 3 PM ET",
  description:
    "Free weekly LIVE training for barbers, stylists, shops and salons: AI for your beauty business with Claude + ShearQuery. Mondays 3 PM ET on Google Meet.",
  alternates: { canonical: `${SITE_URL}/live-training` },
};

const LEARN = [
  { icon: TrendingUp, title: "Where the industry is going", body: "Barber, beauty and wellness in the age of AI — the market trends we're watching and what they mean for your chair." },
  { icon: Sparkles, title: "Real AI use cases", body: "How shops, stylists, booth renters and schools are putting AI to work: Google profiles, reviews, booking and more." },
  { icon: Bot, title: "Claude + ShearQuery", body: "Run your business from Claude — or your favorite AI, like ChatGPT or Gemini — with ShearQuery's industry tools." },
  { icon: Link2, title: "Connect it, live", body: "At the end we walk you through connecting ShearQuery to your own Claude or ChatGPT, step by step." },
];

const STEPS = [
  { icon: CalendarClock, text: "Register below — it's free." },
  { icon: Link2, text: "Your Google Meet link arrives by email 24 hours before (and by text, if you want it)." },
  { icon: VideoOff, text: "Click the link and hop in. No camera needed." },
  { icon: MicOff, text: "Microphones stay muted until the Q&A — then bring your questions." },
  { icon: Gift, text: "Stay to the end for a special gift." },
];

export default async function LiveTrainingPage({ searchParams }: { searchParams: Promise<{ src?: string; utm_source?: string; utm_campaign?: string; via?: string }> }) {
  const q = await searchParams;
  const now = new Date();
  const session = sessionForRegistration(now);
  const start = sessionStart(session);
  const closes = registrationClosesAt(session);
  // No dates on the page — it stays evergreen (lib/live-training/schedule.ts sessionLabel).
  const when = `${sessionLabel(now)} at 3 PM ET`;
  const source = [q.src || q.utm_source, q.utm_campaign].filter(Boolean).join(":").slice(0, 80) || null;

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${EVENT_NAME} (LIVE)`,
    description: "Free weekly LIVE training on AI for barber, beauty and wellness businesses: market trends, AI use cases, and connecting ShearQuery to Claude or ChatGPT.",
    startDate: start.toISOString(),
    endDate: new Date(start.getTime() + EVENT_LENGTH_MIN * 60_000).toISOString(),
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "VirtualLocation", url: `${SITE_URL}/live-training` },
    organizer: { "@type": "Organization", name: EVENT_HOST, url: SITE_URL },
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", url: `${SITE_URL}/live-training`, availability: "https://schema.org/InStock", validThrough: closes.toISOString() },
  };

  return (
    <div className="min-h-screen light bg-slate-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }} />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">Shear<span className="text-blue-400">Query</span></Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest"><Radio className="h-3 w-3" /> Live every Monday</span>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-5 lg:items-start">
          <section className="lg:col-span-3">
            <p className="text-xs font-black uppercase tracking-widest text-blue-400">Hosted by the {EVENT_HOST}</p>
            <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">{EVENT_NAME}</h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              Educate, train and reimagine barber, beauty and wellness in the age of AI. A free LIVE training every Monday — Claude + ShearQuery, or your
              favorite AI like ChatGPT or Gemini.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Next training</p>
              <p className="mt-1 text-xl font-black">{when} <span className="text-base font-bold text-slate-400">(2 PM CT · 12 PM PT)</span></p>
              <p className="mt-1 text-sm text-slate-400">
                Live on Google Meet · about an hour · registration closes Saturday at 3 PM ET.
              </p>
            </div>

            <h2 className="mt-10 text-sm font-black uppercase tracking-widest text-slate-400">What you&apos;ll get</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {LEARN.map((l) => (
                <li key={l.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <l.icon className="h-5 w-5 text-blue-400" />
                  <p className="mt-2 font-black">{l.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{l.body}</p>
                </li>
              ))}
            </ul>

            <h2 className="mt-10 text-sm font-black uppercase tracking-widest text-slate-400">How it works</h2>
            <ol className="mt-4 space-y-3">
              {STEPS.map((s, i) => (
                <li key={s.text} className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{i + 1}</span>
                  <s.icon className="h-4 w-4 shrink-0 text-blue-400" />
                  {s.text}
                </li>
              ))}
            </ol>
          </section>

          <section id="register" className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl lg:sticky lg:top-6 lg:col-span-2">
            <p className="text-xs font-black uppercase tracking-widest text-red-600">Free · Live · Mondays 3 PM ET</p>
            <h2 className="mt-1 text-2xl font-black">Save your seat</h2>
            <p className="mt-1 mb-5 text-sm text-slate-600">For {when.replace(/^This/, "this")}.</p>
            <RegisterForm consentText={SMS_CONSENT_TEXT} audiences={SIGNUP_AUDIENCES.map((a) => ({ id: a.id, label: a.label }))} source={source} via={q.via && /^[A-Za-z0-9-]{3,24}$/.test(q.via) ? q.via : null} />
          </section>
        </div>

        <footer className="mt-16 text-center text-xs text-slate-500">
          <Link href="/links" className="font-bold hover:text-slate-300">Training videos &amp; setup steps</Link> · <Link href="/" className="font-bold hover:text-slate-300">shearquery.com</Link> · ShearQuery by Inner G Complete Agency
        </footer>
      </main>
    </div>
  );
}
