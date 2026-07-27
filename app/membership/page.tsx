import type { Metadata } from "next";
import { Suspense } from "react";
import { Sparkles, BadgeCheck, Users, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { CommunityMembershipForm } from "@/components/forms/CommunityMembershipForm";

export const metadata: Metadata = {
  title: "Free Community Membership — Verified Badge on Your Listing | Inner G Complete",
  description:
    "Join Inner G Complete's free community membership — barbers, stylists, and beauty professionals claim their listing and earn a verified badge on their ShearQuery profile, showing clients and shops it's owner-verified.",
  alternates: {
    canonical: "https://agency.innergcomplete.com/membership",
  },
};

const BENEFITS = [
  {
    icon: BadgeCheck,
    title: "Get the Verified Badge on Your Listing",
    body: "Claim your profile and earn the verified badge shown on your entity page — a clear signal to clients, shop owners, and hiring managers that it's owner-verified and up to date.",
  },
  {
    icon: Users,
    title: "Join a Real Industry Community",
    body: "You're joining a growing directory of barbers and beauty professionals across Texas, not a mailing list.",
  },
  {
    icon: CheckCircle2,
    title: "Free, Always",
    body: "No credit card, no trial period, no upsell. Community membership stays free.",
  },
];

export default function MembershipPage() {
  return (
    <div className="min-h-screen bg-slate-50 light text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-4">
              <Sparkles className="w-3 h-3" />
              Free Community Tier
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 leading-tight mb-4">
              Join the ShearQuery Community
            </h1>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Free membership for barbers, stylists, and beauty professionals. Sign up in under a minute, claim your listing, and earn the verified badge on your ShearQuery profile.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
            <div className="lg:col-span-3 space-y-6">
              {BENEFITS.map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex gap-4 p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                    <benefit.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 mb-1.5">{benefit.title}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed">{benefit.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
              <h2 className="text-lg font-black text-slate-900 mb-1">Create Your Free Membership</h2>
              <p className="text-sm text-slate-500 mb-6">Takes about a minute.</p>
              {/* The form reads claim_type/claim_id from the query string
                  (handed over by ClaimShopButton), so useSearchParams needs a
                  Suspense boundary or this page can't be statically rendered. */}
              <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-100" />}>
                <CommunityMembershipForm />
              </Suspense>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
