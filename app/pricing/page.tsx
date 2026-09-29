import Link from "next/link";
import { Check } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { AUDIENCES, membershipPath, type AudienceId } from "@/lib/audiences";
import { FREE_PUBLISHES_PER_MONTH, PLAN_LABEL, PLANS, PRICES, checkoutIsOpen, planIncludes } from "@/lib/plans";

/**
 * Public pricing: every account type's plans side by side. Prices and what
 * each plan includes come from lib/plans.ts, the same source checkout charges
 * from, so this page can't quote a price the code doesn't.
 */

const TITLE = "Pricing — ShearQuery plans for barbers, salons and schools";
const DESCRIPTION =
  "Plans for barbers, stylists, barbershops, salons, schools and supply stores. Start free; Manage and Autopilot add unlimited Google publishing and automation.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/pricing` },
};

// Rendered per request: the "when it opens" notes and the checkout line
// follow environment switches that can change without a rebuild.
export const dynamic = "force-dynamic";

const TYPES: AudienceId[] = ["barbershop", "salon", "barber", "cosmetologist", "school", "supply_store"];

const FAQS = [
  {
    q: "Is there a free plan?",
    a: `Yes. Every account starts on Free: your listing and verified badge, the full Google profile audit, Claude drafting any fix to your profile, and ${FREE_PUBLISHES_PER_MONTH} Google publishes a month. No card is needed to sign up.`,
  },
  {
    q: "Do I need Claude to use ShearQuery?",
    a: "No. Everything works on the ShearQuery website. Using ShearQuery inside Claude is optional, and needs your own Claude subscription — about $20 a month, paid to Anthropic, separate from any ShearQuery plan.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, any time, from your account. Plans are billed monthly and you keep yours until the end of the month you paid for.",
  },
  {
    q: "Who is always free?",
    a: "Students, clients booking an appointment, and agencies. Agencies earn commission on the businesses they bring to ShearQuery instead of paying.",
  },
];

export default function PricingPage() {
  const open = checkoutIsOpen();
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-5xl px-5 pt-28 pb-20 sm:px-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Pricing</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Every account starts free. Paid plans add unlimited Google publishing and the jobs that run for you — priced for the kind of business you are.
        </p>
        {!open && (
          <p className="mt-4 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Paid plans open soon. Start free today — you&apos;ll be able to upgrade from your account when they do.
          </p>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <section key={p} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black">{PLAN_LABEL[p]}</h2>
              <p className="mt-1 text-sm text-slate-500">{p === "free" ? "$0 — for everyone" : `From $${Math.min(...TYPES.map((t) => PRICES[t]![p]))} a month`}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                {planIncludes(p).map((i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{i}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-black">Monthly price by account type</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Free</th><th className="px-4 py-3">Manage</th><th className="px-4 py-3">Autopilot</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TYPES.map((t) => (
                  <tr key={t}>
                    <td className="px-4 py-3"><p className="font-bold">{AUDIENCES[t].label}</p><p className="text-xs text-slate-500">{AUDIENCES[t].who}</p></td>
                    <td className="px-4 py-3">$0</td>
                    <td className="px-4 py-3 font-bold">${PRICES[t]!.manage}</td>
                    <td className="px-4 py-3 font-bold">${PRICES[t]!.autopilot}</td>
                    <td className="px-4 py-3 text-right"><Link href={membershipPath(t)} className="font-bold text-blue-700 underline">Start free</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Students, clients and agencies are always free. A barber who owns the shop signs up as a barbershop. Prices are in US dollars, billed monthly.
          </p>
        </section>

        <section className="mt-10 max-w-3xl">
          <h2 className="text-xl font-black">Questions</h2>
          <div className="mt-4 space-y-5">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-bold">{f.q}</h3>
                <p className="mt-1 text-sm text-slate-700">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl bg-slate-900 p-6 text-white">
          <h2 className="text-xl font-black">Start free</h2>
          <p className="mt-2 text-sm text-slate-300">Claim your listing and see your full Google profile audit — no card needed.</p>
          <Link href="/membership" className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-black text-slate-900">Create my free account</Link>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph({
            "@type": "FAQPage",
            "@id": `${SITE_URL}/pricing#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          })),
        }}
      />
    </div>
  );
}
