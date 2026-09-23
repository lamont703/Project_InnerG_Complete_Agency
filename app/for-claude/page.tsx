import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Plug, Sparkles, ArrowRight } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { graphJson, faqNode, breadcrumbNode, entityId, ref, ORG_ID, WEBSITE_ID } from "@/lib/schema-graph";
import { PromptCards, type Prompt } from "./prompt-cards";

/**
 * Use ShearQuery from inside your own AI assistant.
 *
 * TWO PATHS ON ONE PAGE, AND THEY ARE NOT EQUAL. Copy-paste prompts work for
 * anybody today with no setup, which is why they are first and take the page.
 * Connecting the MCP server is the better one — it queries this site's data
 * live instead of reading a page, and it is the path that keeps us in the
 * conversation rather than answering it once and disappearing. So the prompts
 * are the on-ramp and the connection is the destination, in that order.
 *
 * EVERY PROMPT POINTS AT A .md TWIN THAT EXISTS. Checked against app/ on
 * 2026-09-22 — /texas-barber-state-board-practical-exam-kit-list is the real
 * path, not the shorter one it is usually called. A prompt naming a 404 does
 * not fail loudly; the assistant invents an answer and our name is on it.
 *
 * THE PROMPTS TELL THE MODEL TO SAY WHEN IT DOES NOT KNOW. Same rule the rest
 * of this project runs on: numbers come from the source, words come from the
 * model, never the other way round.
 */

const TITLE = "Use ShearQuery With Claude | Prompts for Barbers, Salons & Schools";
const DESCRIPTION =
  "Copy ready-made prompts that point Claude or any AI assistant at real ShearQuery data — booth rent, school pass rates, Google profile audits and licensing.";
const PATH = "/for-claude";
const MCP_URL = "https://shearquery.com/mcp";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "ShearQuery MCP server",
    "AI prompts for barbers",
    "Claude prompts for salon owners",
    "barber booth rent data AI",
    "cosmetology school pass rates AI",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}${PATH}`, type: "website" },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

/* Kept short enough to read on screen. Each one names its source and tells the
   model what to do when the source does not answer the question. */
const PROMPTS: Prompt[] = [
  {
    id: "gbp",
    who: "Barbers & stylists",
    title: "Fix my Google profile this week",
    body: `Read https://shearquery.com/google-business-profile-audit.md and https://shearquery.com/google-business-profile-optimization.md.

My business is: [NAME] in [CITY].

Using only what those pages say gets scored, give me:
1. The checks I can fix myself this week, in priority order.
2. For each one, exactly what to do, in plain language.
3. Anything the pages say needs Google connected before it can be seen.

If something isn't covered on those pages, say so instead of guessing.`,
  },
  {
    id: "rent",
    who: "Barbers & stylists",
    title: "Is my booth rent fair?",
    body: `Read https://shearquery.com/barber-booth-rent-houston.md and https://shearquery.com/compare-shops.md.

I pay [AMOUNT] per week for a chair in [CITY]. I work [DAYS] days a week and charge [PRICE] a cut.

Tell me:
1. How my rent compares to what that page reports, and say plainly if the page doesn't cover my city.
2. How many cuts a week just to cover rent.
3. Three questions I should ask my shop owner before I renew.

Use only the numbers on those pages. Don't estimate a rate that isn't there.`,
  },
  {
    id: "suite",
    who: "Shop & suite owners",
    title: "Should I add chairs or go to suites?",
    body: `Read https://shearquery.com/salon-suites-for-rent-houston.md, https://shearquery.com/barber-booth-rent-houston.md and https://shearquery.com/booth-rental-agreement.md.

I run a [X]-chair shop in [CITY]. I collect [AMOUNT] per chair per week. My rent is [AMOUNT] a month.

Work out:
1. What I make today, and what another [N] chairs would add.
2. What the same space would do as suites, using the rates on those pages.
3. What my rental agreement must cover either way, from the agreement page.

Show the math. If a rate isn't on those pages, say so rather than assuming one.`,
  },
  {
    id: "school",
    who: "Students",
    title: "Pick a school on pass rates, not the tour",
    body: `Read https://shearquery.com/compare-schools.md and https://shearquery.com/texas-school-leaderboard.md.

I'm looking at schools in or near [CITY] for [barbering / cosmetology].

Give me:
1. The three with the best exam pass rates that I could reasonably get to.
2. What each one's pass rate actually is, with the number.
3. Ten questions to ask on the tour that the pass rate doesn't answer.

Only use schools that appear on those pages, and tell me if my city isn't covered.`,
  },
  {
    id: "exam",
    who: "Students",
    title: "Build my state board study plan",
    body: `Read https://shearquery.com/texas-barber-state-board-practical-exam-kit-list.md.

My exam is on [DATE]. I have [HOURS] a week to study.

Build me:
1. A kit checklist from that page, marked as what I have vs still need.
2. A week-by-week plan from today to my exam date.
3. The things that page says candidates get wrong most.

If something isn't on that page, say you don't know rather than filling it in.`,
  },
  {
    id: "owner-record",
    who: "Shop & suite owners",
    title: "Explain the booth rent credit report to my barbers",
    body: `Read https://shearquery.com/shearquery-credit-report.md.

Write me three things, in plain language, no jargon:
1. A short text I can send my barbers explaining what this is and what it does for them.
2. What it does NOT do — be direct about it, because I don't want anybody thinking it's a credit score.
3. Answers to the three objections a barber is most likely to raise.

Base every claim on that page.`,
  },
];

const FAQ = [
  {
    q: "Do I need to pay for anything to use these?",
    a: "No. The prompts are free, the pages they read are free, and you can use them in any assistant you already have.",
  },
  {
    q: "Will this work in ChatGPT or Gemini instead of Claude?",
    a: "Yes. The prompts point at public pages, so any assistant that can read a link can run them. The connection option further down is Claude-specific for now.",
  },
  {
    q: "Why does every prompt name a .md link?",
    a: "Every public ShearQuery page has a plain-text twin at the same address with .md on the end. It's built for AI assistants to read, so pointing at it gets a cleaner answer than the normal page.",
  },
  {
    q: "What stops the AI making numbers up?",
    a: "Each prompt tells it to use only what the page says and to admit when something isn't covered. That's not a guarantee — always check a number that matters against the page itself.",
  },
  {
    q: "What is the difference between the prompts and connecting ShearQuery?",
    a: "A prompt makes your assistant read a page. Connecting it lets your assistant query our data directly — school pass rates, booth rent and chair availability, and Texas licensee counts — and ask follow-up questions against live records.",
  },
];

export default function ForClaudePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 light text-slate-900">
      <Navbar />

      <main className="flex-1 px-4 pb-20 pt-24 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: graphJson(
              {
                "@type": "Service",
                "@id": entityId(PATH),
                name: "ShearQuery for AI assistants",
                serviceType: "Industry data for AI assistants",
                description: DESCRIPTION,
                provider: ref(ORG_ID),
                isPartOf: ref(WEBSITE_ID),
                areaServed: { "@type": "Country", name: "United States" },
                offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              },
              faqNode(PATH, FAQ.map((f) => ({ q: f.q, a: f.a })), entityId(PATH)),
              breadcrumbNode(PATH, [
                { name: "ShearQuery", path: "/" },
                { name: "Use with Claude", path: PATH },
              ]),
            ),
          }}
        />

        <div className="mx-auto max-w-4xl">
          <header className="mx-auto max-w-3xl text-center">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
              <Bot className="h-3 w-3" />
              Free · nothing to install
            </span>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Point your AI at real numbers from this industry
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Most AI answers about this trade are guesses, because the tools were never given
              anything real to read. These prompts hand your assistant our actual data — booth
              rent, pass rates, licensing, Google profile scoring — and tell it to say so when it
              doesn&apos;t know. Copy one, paste it in, fill in the brackets.
            </p>
          </header>

          <section className="mt-12">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h2 className="text-2xl font-black">Copy a prompt</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Replace anything in [BRACKETS] with your own details before you send it.
            </p>
            <PromptCards prompts={PROMPTS} />
          </section>

          {/* The better path, stated as such rather than buried. */}
          <section className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-blue-600" />
              <h2 className="text-2xl font-black">Or connect ShearQuery to Claude</h2>
            </div>
            <p className="mt-3 text-base leading-relaxed text-slate-700">
              A prompt makes your assistant read a page. Connecting it lets your assistant ask our
              database directly, and keep asking. Add this address as a connector in Claude:
            </p>
            <div className="mt-4 rounded-xl bg-slate-900 px-4 py-3 font-mono text-sm text-emerald-300">
              {MCP_URL}
            </div>
            <p className="mt-4 text-sm font-black uppercase tracking-wide text-slate-500">
              What it can answer today
            </p>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
              <li>1. Compare barber and cosmetology schools by exam pass rate.</li>
              <li>2. Compare barbershops and salons by booth rent and chair availability.</li>
              <li>3. Count Texas barber and cosmetology licensees, by type and area.</li>
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              That list is short on purpose and it&apos;s going to grow. If there&apos;s something
              you want your AI to be able to ask us,{" "}
              <Link href="/waitlist" className="font-bold text-blue-700 underline">
                get on the waitlist
              </Link>{" "}
              and tell me in the last question.
            </p>
          </section>

          <section className="mx-auto mt-16 max-w-3xl">
            <h2 className="text-2xl font-black sm:text-3xl">Questions</h2>
            <div className="mt-6 space-y-4">
              {FAQ.map((f) => (
                <div key={f.q} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-black">{f.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-2xl text-center">
            <h2 className="text-2xl font-black sm:text-3xl">Try one on your own shop</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Start with the Google profile one. It takes a minute and it tells you something you
              can fix today. So copy it and run it.
            </p>
            <a
              href="#top"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Back to the prompts
              <ArrowRight className="h-4 w-4" />
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
