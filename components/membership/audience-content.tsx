import Link from "next/link";
import {
  Sparkles,
  BadgeCheck,
  Users,
  CheckCircle2,
  Calendar,
  MapPin,
  GraduationCap,
  BarChart3,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { LIVE_AUDIENCES, membershipPath, type Audience, type AudienceBenefit } from "@/lib/audiences";

/**
 * How an audience is drawn. Nothing here decides WHICH audience — that is the
 * caller's job, and the two callers learn it in different ways.
 *
 * NO "use client" DIRECTIVE, DELIBERATELY. These components take props and call
 * no hooks, so the file is whatever its importer is: rendered on the server for
 * /membership/[audience], where the audience is in the path and there is
 * nothing to hydrate, and bundled into the client for /membership, where
 * membership-intro.tsx has to read `?for=` in the browser. One implementation
 * of the visual, two rendering strategies — which is the whole reason the
 * audience pages can exist without forking the design.
 */

const ICONS: Record<AudienceBenefit["icon"], LucideIcon> = {
  sparkles: Sparkles,
  "badge-check": BadgeCheck,
  users: Users,
  "check-circle": CheckCircle2,
  calendar: Calendar,
  "map-pin": MapPin,
  "graduation-cap": GraduationCap,
  "bar-chart": BarChart3,
};

/**
 * Where the switcher points.
 *
 * `path` on the landing pages, so a tap moves between real URLs. `query` on
 * /membership, so the hub keeps behaving exactly as it always has and every
 * existing `?for=` link, ad and email still lands where it used to.
 */
export type SwitcherVariant = "path" | "query";

export function audienceHref(a: Audience, variant: SwitcherVariant): string {
  // One definition of the path shape, in the registry, so a slug change
  // reaches the switcher and the five link sites together.
  if (variant === "path" && a.landing) return membershipPath(a.id);
  return `/membership?for=${a.id}`;
}

export function AudienceHeading({ audience }: { audience: Audience }) {
  return (
    <>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
        <Sparkles className="w-3 h-3" />
        {audience.eyebrow}
      </span>
      <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 leading-tight mb-4">
        {audience.headline}
      </h1>
      <p className="text-slate-600 text-base sm:text-lg leading-relaxed">{audience.subhead}</p>
    </>
  );
}

/**
 * The audience switcher.
 *
 * Kept on the landing pages rather than dropped as redundant: someone who
 * followed a student link but owns a shop can say so in one tap instead of
 * bouncing off copy written for somebody else. That was true when this was one
 * page with a query string and it is still true across three URLs.
 */
export function AudienceSwitcher({
  activeId,
  variant,
}: {
  activeId: Audience["id"];
  variant: SwitcherVariant;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {LIVE_AUDIENCES.map((a) => {
        const isActive = a.id === activeId;
        return (
          <Link
            key={a.id}
            href={audienceHref(a, variant)}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
              isActive
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AudienceBenefitList({ audience }: { audience: Audience }) {
  return (
    <div className="space-y-6">
      {audience.benefits.map((benefit) => {
        const Icon = ICONS[benefit.icon];
        return (
          <div
            key={benefit.title}
            className="flex gap-4 p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 mb-1.5">{benefit.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{benefit.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The part that is only on this page.
 *
 * Benefits and headline come from the registry and are what the hub can already
 * show with `?for=`. These two sections are what make a landing page a page
 * rather than a variant of one — see the note on AudienceLanding about why that
 * distinction is load-bearing rather than cosmetic.
 */
export function AudienceFaqs({ audience }: { audience: Audience }) {
  if (!audience.landing) return null;
  return (
    <section className="mt-14">
      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 mb-5">
        Questions {audience.label.toLowerCase()}s ask
      </h2>
      <dl className="space-y-4">
        {audience.landing.faqs.map((f) => (
          <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
            <dt className="text-sm font-black text-slate-900 mb-2">{f.q}</dt>
            <dd className="text-sm text-slate-600 leading-relaxed">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function AudienceNextLinks({ audience }: { audience: Audience }) {
  if (!audience.landing) return null;
  return (
    <section className="mt-14">
      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 mb-5">
        Free either way — no account needed
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {audience.landing.nextLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/40"
          >
            <span className="flex items-center gap-1.5 text-sm font-black text-slate-900 mb-1.5">
              {l.label}
              <ArrowRight className="h-3.5 w-3.5 text-blue-600 transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="block text-sm text-slate-600 leading-relaxed">{l.body}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
