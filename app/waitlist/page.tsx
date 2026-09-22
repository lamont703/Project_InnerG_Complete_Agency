import type { Metadata } from "next";
import {
  Users,
  Clock,
  Wallet,
  GraduationCap,
  Youtube,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { graphJson, faqNode, breadcrumbNode, entityId, ref, ORG_ID, WEBSITE_ID } from "@/lib/schema-graph";
import { WaitlistForm } from "./waitlist-form";

/**
 * The ShearQuery waitlist — where the YouTube channel sends people.
 *
 * IT SELLS NOTHING, AND SAYS SO. The delivery mechanism is genuinely not
 * decided yet: course, program, service or the product itself. A page that
 * invented one to look finished would be a promise we would then have to keep
 * or quietly drop, in front of the audience the videos are building. So the
 * page is honest about the state of it, and asks for the list instead.
 *
 * THE COPY IS FIRST PERSON AND STORY-LED because lib/voice-dna.ts settles that
 * dial: a version written clean, data-led and impersonal was tested against a
 * story-led one and rejected — "stripping the dialect out also stripped the
 * PERSON out". The shop-expansion story is used here because that file flags it
 * as the most commercially useful thing in it and it is the exact shape of the
 * argument: a vehicle that could not scale.
 *
 * THE FREE-TEXT QUESTION IS THE RESEARCH. What people say they want ASI to do
 * is what decides the offer, so the form asks it plainly and stores the answer
 * in their own words (shearquery_waitlist.asi_intent).
 */

const TITLE = "Join the ShearQuery Waitlist | AI for Barber, Beauty & Wellness Pros";
const DESCRIPTION =
  "Join the ShearQuery waitlist: use artificial super intelligence in your barber, beauty or wellness business to fill chairs, save hours and earn more.";
const PATH = "/waitlist";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "AI for barbers",
    "artificial intelligence for salons",
    "barber marketing waitlist",
    "AI for beauty professionals",
    "AI for wellness business",
    "ShearQuery waitlist",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}${PATH}`, type: "website" },
  alternates: { canonical: `${SITE_URL}${PATH}` },
};

/** What the offer will help with, whatever shape it ends up taking. */
const OUTCOMES = [
  {
    icon: Users,
    title: "Fill the chair",
    body:
      "Getting found by the people who are already searching for you, and answering them before somebody else does. Most of this industry is fighting for attention on social media while the people ready to book are somewhere else entirely.",
  },
  {
    icon: Clock,
    title: "Get your hours back",
    body:
      "The work around the work — the texts, the reminders, the rebooking, the posts, the paperwork. That is where the day goes, and it is the part a machine can carry for you once you know how to set it up.",
  },
  {
    icon: Wallet,
    title: "Build income that keeps paying",
    body:
      "I learned the hard way that a chair only scales so far, because there is a cap on how many chairs you have. Anything that earns while you are cutting has to come from somewhere other than your hands.",
  },
  {
    icon: GraduationCap,
    title: "Know what is actually happening",
    body:
      "Not hype, and not somebody's course selling you a prompt. What these tools genuinely do for a shop, a suite, a school or a supplier, tested on real work in this industry before I tell you about it.",
  },
];

const FAQ = [
  {
    q: "What exactly am I joining?",
    a: "A list, and nothing more than that. I'm still deciding whether this is best delivered as a course, a program, a done-for-you service or as software. When it's ready I'll tell you what it is, what it costs and who it's for, and you can decide then.",
  },
  {
    q: "Does it cost anything to be on the waitlist?",
    a: "No. Nothing is for sale on this page and joining costs nothing.",
  },
  {
    q: "Who is this for?",
    a: "Barbers, stylists, braiders, locticians, estheticians, nail and lash techs, shop and suite owners, instructors, students and the suppliers who serve them. If you make your living in the barber, beauty and wellness industry, it's for you.",
  },
  {
    q: "Do I need to be technical?",
    a: "No. I've been a licensed barber for over 20 years and a software engineer for the last five, and the whole reason I'm doing this is that the people who can explain these tools have never stood behind a chair.",
  },
  {
    q: "How will you contact me?",
    a: "By email, and by text if you leave a number. That's why the form asks for both, and it's also why the number is optional.",
  },
  {
    q: "What happens to my information?",
    a: "It's used to tell you when this opens and nothing else. It isn't published anywhere on the site, it isn't sold, and you can ask to come off the list whenever you want.",
  },
];

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const src = typeof params.src === "string" ? params.src : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 light text-slate-900">
      <Navbar />

      <main className="flex-1 px-4 pb-20 pt-24 sm:px-6">
        {/*
          A Service node so the page states what this is and who provides it,
          plus the FAQ. The FAQ markup earns no rich result — Google removed that
          in 2026 — but the .md layer this site publishes is read by answer
          engines, and the questions are the most machine-readable part here.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: graphJson(
              {
                "@type": "Service",
                "@id": entityId(PATH),
                name: "ShearQuery — AI training and tools for the barber, beauty and wellness industry",
                serviceType: "Artificial intelligence enablement",
                description: DESCRIPTION,
                provider: ref(ORG_ID),
                isPartOf: ref(WEBSITE_ID),
                areaServed: { "@type": "Country", name: "United States" },
                audience: {
                  "@type": "BusinessAudience",
                  name: "Barbers, stylists, cosmetologists, shop and suite owners, schools and suppliers",
                },
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                  availability: "https://schema.org/PreOrder",
                  description: "Joining the waitlist is free. The offer itself is not open yet and no date is promised.",
                },
              },
              faqNode(PATH, FAQ.map((f) => ({ q: f.q, a: f.a })), entityId(PATH)),
              breadcrumbNode(PATH, [
                { name: "ShearQuery", path: "/" },
                { name: "Waitlist", path: PATH },
              ]),
            ),
          }}
        />

        <div className="mx-auto max-w-5xl">
          <header className="mx-auto max-w-3xl text-center">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
              <Youtube className="h-3 w-3" />
              Waitlist now open
            </span>
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              I&apos;m teaching this industry how to use artificial super intelligence
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              I&apos;ve been a licensed barber for over 20 years and a software engineer for the
              last five, and I&apos;m putting those two things together for the barber, beauty and
              wellness industry. It isn&apos;t open yet. Get on the list and you&apos;ll hear from
              me first.
            </p>
          </header>

          {/* The form sits high on purpose: the channel sends people here to do one thing. */}
          <section className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black">Join the waitlist</h2>
            <p className="mt-1 mb-5 text-sm text-slate-600">
              Free, and it takes about a minute. The last question is the one I read.
            </p>
            <WaitlistForm source={src} />
          </section>

          {/* The story. voice-dna: he walks you to the point rather than announcing it. */}
          <section className="mx-auto mt-16 max-w-3xl">
            <h2 className="text-2xl font-black sm:text-3xl">Why I&apos;m building it</h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-700">
              <p>
                Years ago I expanded my barbershop. I leased the unit next door, knocked down the
                wall between them, and put in six or seven more chairs, and I was proud of it. I was
                going to have more chairs, more barbers, more booth rent coming in. That&apos;s
                growth, right?
              </p>
              <p>
                A customer told me back then that it wasn&apos;t a scalable business model. He
                wasn&apos;t even my customer, he was somebody else&apos;s client in my shop, and I
                wasn&apos;t trying to hear it, because the business was doing well and I was
                emotionally attached to it. It took me another three or four years to see he was
                right. Your costs keep going up, and there&apos;s a cap on your chairs, so the
                margins just get smaller, and smaller, and smaller.
              </p>
              <p>
                What I learned from that is the thing I keep coming back to: it wasn&apos;t that I
                worked too little or cared too little. It&apos;s that the vehicle I was in
                couldn&apos;t get me where I was trying to go. So make sure you&apos;re paying
                attention to the type of vehicle you are in.
              </p>
              <p>
                I&apos;m not saying artificial intelligence replaces the craft. Nobody is cutting
                hair through a screen, and the chair is still the chair. What I am saying is that
                this is the first tool I&apos;ve seen that changes the cap — on how many people can
                find you, on how much of your day gets eaten by everything that isn&apos;t cutting,
                and on how you can earn outside of your own two hands.
              </p>
            </div>
          </section>

          {/* What the offer will do, whatever shape it takes. */}
          <section className="mt-16">
            <h2 className="text-center text-2xl font-black sm:text-3xl">What I&apos;ll help you do</h2>
            <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
              {OUTCOMES.map((o) => (
                <div key={o.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <o.icon className="h-6 w-6 text-blue-600" />
                  <h3 className="mt-3 text-lg font-black">{o.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{o.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Honesty about the state of it, which is the reason the list exists. */}
          <section className="mx-auto mt-16 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black">Straight up: I haven&apos;t decided the format</h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
              <p>
                I could tell you today that this is a course, and it would sound more finished than
                it is. I&apos;d rather be straight with you. It might be a course, it might be a
                program with me in it, it might be done-for-you, or it might be software you log
                into. I&apos;m still working that part out, and I&apos;m working it out in public on
                the channel.
              </p>
              <p>
                What isn&apos;t undecided is what it&apos;s for. However it gets delivered,
                it&apos;s going to help you get more customers, get your time back, and build income
                that doesn&apos;t stop the moment you put the clippers down.
              </p>
              <p>
                That last question on the form is how you get a say in it. Tell me how you&apos;re
                aiming to use this in your business, in your own words, and I&apos;ll build toward
                what people actually say.
              </p>
            </div>
          </section>

          {/* FAQ — the same questions the JSON-LD above asserts. */}
          <section className="mx-auto mt-16 max-w-3xl">
            <h2 className="text-2xl font-black sm:text-3xl">Questions</h2>
            <div className="mt-6 space-y-4">
              {FAQ.map((f) => (
                <div key={f.q} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="flex items-start gap-2 text-sm font-black">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    {f.q}
                  </h3>
                  <p className="mt-2 pl-6 text-sm leading-relaxed text-slate-600">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-2xl text-center">
            <h2 className="text-2xl font-black sm:text-3xl">Get on the list</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              When it opens, the people on this list hear about it first, and they hear what it is
              before anybody is asked for anything. So join the waitlist.
            </p>
            <a
              href="#join"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Join the ShearQuery waitlist
              <ArrowRight className="h-4 w-4" />
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
