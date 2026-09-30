import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Bot, CalendarCheck, PlayCircle, Sparkles, UserPlus, Search } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { CLAUDE_FEATURES, type ClaudeFeature } from "@/lib/account-features";
import { PLAN_LABEL } from "@/lib/plans";
import { CopyField } from "@/components/account/copy-field";
import { CopyBlock } from "@/components/links/copy-block";

/**
 * THE LINK IN BIO — /links.
 *
 * Where our Instagram, TikTok and YouTube bios point. Built 2026-09-29 around
 * one job: TRAINING the barber, beauty and wellness industry to run their
 * business — and let their clients book — with Claude + ShearQuery. So it
 * leads with the training (our YouTube channel) and hands over copy-paste
 * steps for putting ShearQuery into their own AI.
 *
 * NOTHING HERE IS WRITTEN FROM MEMORY:
 *  - "What it does" is rendered from CLAUDE_FEATURES (lib/account-features.ts),
 *    the same registry Claude and agencies read, and its "Available now / In
 *    testing" comes from the switches the tools obey — so this page can't call
 *    a feature open before it is.
 *  - Claude's steps are from claude.com/docs/connectors/custom/add-unlisted
 *    (Customize > Connectors, "Sign in when needed", Free plan = one custom
 *    connector), read 2026-09-29.
 *  - ChatGPT's are from developers.openai.com/api/docs/guides/developer-mode
 *    (Settings > Security and login > Developer mode; Plugins > +; Plus, Pro,
 *    Business, Enterprise, Education on the web), read 2026-09-29.
 *  - The channel is @shearqueryai (UC2R_pYoza1bxm-iOhWtO6AA), the one our
 *    publisher uploads to — lib/youtube-publish.ts. Checked it resolves.
 *
 * Taps are tracked (data-ig-click, and links_copy for the copy buttons) so we
 * can see which video bios send people and what they take with them.
 */

export const metadata: Metadata = {
  title: "Claude + ShearQuery Training for Barbers, Stylists & Salons",
  description:
    "Free training for barbers, stylists, shops and salons on running your business with Claude + ShearQuery, plus copy-paste steps to connect ShearQuery to your AI.",
  alternates: { canonical: `${SITE_URL}/links` },
};

export const dynamic = "force-dynamic";

const YOUTUBE = "https://www.youtube.com/@shearqueryai";
const MCP_URL = `${SITE_URL}/mcp`;

const SETUP_STEPS = `Add ShearQuery to your AI

Server address: ${MCP_URL}

CLAUDE (what we use in the training)
1. In Claude, go to Customize → Connectors → Add custom connector.
2. Name it ShearQuery and paste the server address.
3. If it asks how people sign in, choose "Sign in when needed".
4. In a chat, tap + → Connectors and make sure ShearQuery is on.
5. Ask it something. The first time you use your own account, Claude asks you to sign in to ShearQuery or create a free account.

CHATGPT (Plus, Pro, Business, Enterprise or Education, on the web)
1. Settings → Security and login → turn on Developer mode.
2. Go to Plugins, tap +, and create a developer-mode app with the server address.
3. In a chat, open the + menu → Developer mode, and pick ShearQuery.

ANY OTHER AI APP THAT SUPPORTS MCP
Add a remote MCP server (streamable HTTP) with the server address.

Training: ${YOUTUBE}`;

const PROMPTS: { who: string; prompts: string[] }[] = [
  {
    who: "Shops, salons, barbers and stylists",
    prompts: [
      "Audit my Google Business Profile and tell me the three fixes that matter most.",
      "Draft a reply to my latest Google review.",
      "What does my week look like on my ShearQuery calendar?",
      "Take a 25% deposit when clients book, and give a full refund if they cancel 24 hours ahead.",
    ],
  },
  {
    who: "Your clients",
    prompts: ["Book me a haircut with [your barber's name] on ShearQuery this Friday.", "Move my ShearQuery appointment to Saturday."],
  },
  {
    who: "Students and schools",
    prompts: ["Compare barber schools near Houston by exam pass rate."],
  },
  {
    who: "Agencies",
    prompts: ["What should I do next as a ShearQuery agency partner?"],
  },
];

const GROUPS: { title: string; icon: typeof Sparkles; ids: string[] }[] = [
  { title: "For your business", icon: Sparkles, ids: ["google_profile", "calendar", "autopilot", "instagram"] },
  { title: "For your clients", icon: CalendarCheck, ids: ["client_booking"] },
  { title: "For anyone", icon: Search, ids: ["industry_data"] },
];

function FeatureCard({ f }: { f: ClaudeFeature }) {
  const status = f.status();
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-black text-slate-900">{f.title}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${status === "live" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
          {status === "live" ? "Available now" : "In testing"}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600">{PLAN_LABEL[f.plan]} plan</span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.what}</p>
      {f.needs && <p className="mt-1.5 text-xs text-slate-500">{f.needs}</p>}
    </li>
  );
}

const big = "flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left font-black shadow-sm transition";

export default function LinksPage() {
  const byId = new Map(CLAUDE_FEATURES.map((f) => [f.id, f]));
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-xl px-4 pb-20 pt-10 sm:px-6">
        <header className="text-center">
          <Link href="/" className="text-2xl font-black tracking-tight">
            Shear<span className="text-blue-600">Query</span>
          </Link>
          <p className="mx-auto mt-4 flex w-fit items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
            <Bot className="h-3 w-3" /> Claude + ShearQuery training
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">Run your chair with AI</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-600">
            Free training for barbers, stylists, shops, salons and schools: connect ShearQuery to Claude and use it to run your Google profile,
            your appointment book, and let clients book you from their own AI.
          </p>
        </header>

        <nav className="mt-8 space-y-3" aria-label="Links">
          <a href={YOUTUBE} target="_blank" rel="noopener noreferrer" data-ig-click="links_youtube" className={`${big} bg-red-600 text-white hover:bg-red-700`}>
            <span className="flex items-center gap-3"><PlayCircle className="h-6 w-6" /> Watch the training on YouTube</span>
            <ArrowUpRight className="h-5 w-5" />
          </a>
          <a href="#connect" data-ig-click="links_connect" className={`${big} bg-slate-900 text-white hover:bg-slate-800`}>
            <span className="flex items-center gap-3"><Bot className="h-6 w-6" /> Put ShearQuery in your AI</span>
            <span className="text-xs font-bold opacity-80">Copy the steps</span>
          </a>
          <Link href="/membership" data-ig-click="links_join" className={`${big} border border-slate-200 bg-white text-slate-900 hover:border-slate-400`}>
            <span className="flex items-center gap-3"><UserPlus className="h-6 w-6 text-blue-600" /> Create your free account</span>
            <ArrowUpRight className="h-5 w-5 text-slate-400" />
          </Link>
          <Link href="/search" data-ig-click="links_search" className={`${big} border border-slate-200 bg-white text-slate-900 hover:border-slate-400`}>
            <span className="flex items-center gap-3"><Search className="h-6 w-6 text-blue-600" /> Find a barber, stylist or school</span>
            <ArrowUpRight className="h-5 w-5 text-slate-400" />
          </Link>
        </nav>

        <section id="connect" className="mt-12 scroll-mt-6">
          <h2 className="text-xl font-black tracking-tight">Put ShearQuery in your AI</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            We use Claude in the training. It takes about two minutes, and you only do it once.
          </p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <CopyField label="Server address" value={MCP_URL} />
            <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
              <li>In Claude, go to <strong>Customize → Connectors → Add custom connector</strong>.</li>
              <li>Name it <strong>ShearQuery</strong> and paste the server address.</li>
              <li>If it asks how people sign in, choose <strong>Sign in when needed</strong>.</li>
              <li>In a chat, tap <strong>+ → Connectors</strong> and make sure ShearQuery is on.</li>
              <li>Ask it something. The first time you use your own account, Claude asks you to sign in or create a free ShearQuery account.</li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              Claude&apos;s Free plan can add one custom connector. ChatGPT needs Developer mode (Plus, Pro, Business, Enterprise or Education, on the web) — the steps are below.
            </p>
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-wide text-slate-500">All the steps, to copy and keep</p>
          <div className="mt-2">
            <CopyBlock text={SETUP_STEPS} label="Copy steps" event="setup_steps" />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-black tracking-tight">Try it — things to ask</h2>
          <p className="mt-1 text-sm text-slate-600">Copy one into your AI once ShearQuery is connected.</p>
          <div className="mt-4 space-y-5">
            {PROMPTS.map((g) => (
              <div key={g.who}>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{g.who}</p>
                <div className="mt-2 space-y-2">
                  {g.prompts.map((p, i) => <CopyBlock key={p} text={p} compact event={`prompt_${g.who.split(" ")[0].toLowerCase()}_${i}`} />)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-black tracking-tight">What it does</h2>
          <p className="mt-1 text-sm text-slate-600">What ShearQuery can do inside your AI today. Anything still in testing says so.</p>
          <div className="mt-4 space-y-6">
            {GROUPS.map((g) => {
              const Icon = g.icon;
              const list = g.ids.map((id) => byId.get(id)).filter(Boolean) as ClaudeFeature[];
              return (
                <div key={g.title}>
                  <p className="flex items-center gap-2 text-sm font-black"><Icon className="h-4 w-4 text-blue-600" /> {g.title}</p>
                  <ul className="mt-2 space-y-2">{list.map((f) => <FeatureCard key={f.id} f={f} />)}</ul>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Every account starts free. <Link href="/pricing" className="font-bold text-blue-700 underline">See plans</Link>.
          </p>
        </section>

        <section className="mt-12 rounded-2xl bg-slate-900 p-6 text-center text-white">
          <PlayCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-2 text-lg font-black">The training is on YouTube</p>
          <p className="mt-1 text-sm text-slate-300">Setting up ShearQuery in Claude, and using it for your business and your clients.</p>
          <a href={YOUTUBE} target="_blank" rel="noopener noreferrer" data-ig-click="links_youtube_bottom" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black hover:bg-red-700">
            Subscribe to @shearqueryai <ArrowUpRight className="h-4 w-4" />
          </a>
        </section>

        <footer className="mt-10 text-center text-xs text-slate-400">
          <Link href="/" className="font-bold hover:text-slate-600">shearquery.com</Link> · by Inner G Complete Agency
        </footer>
      </main>
    </div>
  );
}
