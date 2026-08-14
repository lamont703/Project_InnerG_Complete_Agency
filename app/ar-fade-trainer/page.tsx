"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Navbar } from "@/components/layout/navbar"
import { FadeArView } from "@/components/ar/fade-ar-view"
import { SITE_URL } from "@/lib/site"
import { graph, ref, ORG_ID, WEBSITE_ID, breadcrumbId, pageId } from "@/lib/schema-graph"
import { authorSchema } from "@/lib/author"
import {
  GUARDS,
  HEIGHT_LABEL,
  BOTTOM_LABEL,
  bottomGuardId,
  deriveFadePlan,
  fadeName,
  guardById,
  type FadeBottom,
  type FadeHeight,
  type FadeSpec,
} from "@/lib/fade-geometry"

const ROUTE = "/ar-fade-trainer"

/**
 * Side-profile preview of the derived plan.
 *
 * Exists for two reasons. A student can read the whole plan — line placement,
 * ladder, spacing — before ever turning a camera on, which is most of the value
 * on a laptop. And it means the page has the plan as visible content rather
 * than only inside a canvas, so there is something on it for a reader that does
 * not run JavaScript, and something for the .md layer to carry.
 *
 * Heights come from the same `u` the overlay uses, mapped onto a fixed profile,
 * so the diagram and the camera cannot disagree about where a mid fade sits.
 */
function ProfileDiagram({ spec }: { spec: FadeSpec }) {
  const plan = useMemo(() => deriveFadePlan(spec), [spec])
  const y = (u: number) => 190 - u * 130

  return (
    <svg viewBox="0 0 210 210" className="h-auto w-full max-w-[280px]" role="img" aria-label={`Side profile showing where a ${fadeName(spec)} sits on the head`}>
      <defs>
        <clipPath id="skull">
          <ellipse cx="100" cy="100" rx="62" ry="90" />
        </clipPath>
      </defs>

      <ellipse cx="100" cy="100" rx="62" ry="90" className="fill-slate-800" />

      <g clipPath="url(#skull)">
        {plan.ladder.map((rung, i) => {
          const t = plan.ladder.length <= 1 ? 0 : i / (plan.ladder.length - 1)
          return (
            <rect
              key={rung.guard.id}
              x="0"
              width="210"
              y={y(rung.uTo)}
              height={Math.max(y(rung.uFrom) - y(rung.uTo), 0.5)}
              fill={`hsl(196 ${88 - t * 26}% ${34 + t * 44}%)`}
              opacity="0.92"
            />
          )
        })}
      </g>

      {/* Ear, so the anatomy the line is placed against is visible too. */}
      <ellipse cx="74" cy={(y(0.55) + y(0.74)) / 2} rx="9" ry="13" className="fill-none stroke-slate-400" strokeWidth="1.5" />

      <line x1="30" x2="170" y1={y(plan.uLine)} y2={y(plan.uLine)} stroke="white" strokeWidth="2.5" />
      <line x1="30" x2="170" y1={y(1.1)} y2={y(1.1)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />

      {/* A high fade puts the line within a couple of pixels of the ridge —
          which is the point being made — so the two labels are pushed apart
          rather than left overlapping into an unreadable smudge. */}
      {(() => {
        const yLine = y(plan.uLine)
        const yRidge = y(1.1)
        const collides = Math.abs(yLine - yRidge) < 11
        return (
          <>
            <text x="174" y={yLine + (collides ? 8 : 4)} className="fill-white text-[9px] font-semibold">line</text>
            <text x="174" y={yRidge - (collides ? 5 : -4)} className="fill-slate-400 text-[9px]">ridge</text>
          </>
        )
      })()}
      <text x="174" y={(y(0.55) + y(0.74)) / 2 + 4} className="fill-slate-400 text-[9px]">ear</text>
    </svg>
  )
}

export default function ArFadeTrainerPage() {
  const { setTheme } = useTheme()
  useEffect(() => {
    setTheme("light")
  }, [setTheme])

  const [height, setHeight] = useState<FadeHeight>("mid")
  const [bottom, setBottom] = useState<FadeBottom>("skin")
  const [topGuard, setTopGuard] = useState("3")
  const [stepIndex, setStepIndex] = useState(0)

  const spec: FadeSpec = useMemo(() => ({ height, bottom, topGuard }), [height, bottom, topGuard])
  const plan = useMemo(() => deriveFadePlan(spec), [spec])

  // Only lengths above the shortest point can be the top — anything else
  // describes a haircut with no transition in it.
  const topOptions = useMemo(() => {
    const floor = guardById(bottomGuardId(bottom))?.inches ?? 0
    return GUARDS.filter((g) => g.inches > floor)
  }, [bottom])

  useEffect(() => {
    if (!topOptions.some((g) => g.id === topGuard)) setTopGuard(topOptions[topOptions.length - 1]?.id ?? "3")
  }, [topOptions, topGuard])

  useEffect(() => setStepIndex(0), [spec])

  const activeRung = plan.steps[stepIndex]?.rung ?? null

  const pill = (on: boolean) =>
    `rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
      on ? "bg-slate-900 text-white shadow" : "bg-white text-slate-500 hover:text-slate-900 border border-slate-200"
    }`

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 pt-28 pb-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Augmented reality · Interactive tool</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">AR Fade Trainer</h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
          Pick the finished cut first. The tool works backwards from it — where the line has to sit on the skull, which
          guards form the ladder underneath it, and what order the passes go in — then draws that plan on a real head
          through your phone&apos;s camera.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <h2 className="text-lg font-bold">1. Name the finished cut</h2>
          <p className="mt-1 text-sm text-slate-600">Everything below is derived from these three choices.</p>

          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">How high</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(HEIGHT_LABEL) as FadeHeight[]).map((h) => (
                  <button key={h} onClick={() => setHeight(h)} className={pill(height === h)}>
                    {HEIGHT_LABEL[h]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Shortest point</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(BOTTOM_LABEL) as FadeBottom[]).map((b) => (
                  <button key={b} onClick={() => setBottom(b)} className={pill(bottom === b)}>
                    {BOTTOM_LABEL[b]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Length on top</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {topOptions.map((g) => (
                  <button key={g.id} onClick={() => setTopGuard(g.id)} className={pill(topGuard === g.id)}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <h2 className="text-lg font-bold">2. What that shape requires</h2>
        <div className="mt-4 grid gap-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-slate-100 sm:grid-cols-[280px_1fr] sm:p-8">
          <div className="flex flex-col items-center gap-3">
            <ProfileDiagram spec={spec} />
            <p className="text-center text-sm font-bold">{fadeName(spec)}</p>
          </div>

          <div>
            <p className="text-sm leading-relaxed text-slate-300">{plan.placement}</p>

            <div className="mt-5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Guard ladder</span>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {plan.ladder.length === 0 ? (
                  <span className="text-sm text-amber-300">No transition — pick a longer top.</span>
                ) : (
                  plan.ladder.map((rung, i) => (
                    <span key={rung.guard.id} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-slate-600">→</span>}
                      <span className="rounded-md bg-slate-800 px-2.5 py-1 font-mono text-xs">{rung.guard.label}</span>
                    </span>
                  ))
                )}
              </div>
            </div>

            <ol className="mt-6 space-y-1.5">
              {plan.steps.map((step, i) => (
                <li key={step.title}>
                  <button
                    onClick={() => setStepIndex(i)}
                    className={`w-full rounded-xl px-4 py-3 text-left transition ${
                      i === stepIndex ? "bg-cyan-500/15 ring-1 ring-cyan-400/40" : "hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="flex gap-3">
                      <span className={`font-mono text-xs ${i === stepIndex ? "text-cyan-300" : "text-slate-500"}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{step.title}</span>
                        {i === stepIndex && (
                          <span className="mt-1 block text-sm leading-relaxed text-slate-400">{step.detail}</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <h2 className="text-lg font-bold">3. Put it on a head</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          The overlay follows the step selected above — the highlighted band is the pass you are on, and the amber arc
          is the angle to flick out at as you reach the top of it.
        </p>
        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <FadeArView spec={spec} activeRung={activeRung} />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <div className="space-y-10 text-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Why start from the finished cut</h2>
            <p className="mt-3 leading-relaxed">
              Most people are taught a fade as a sequence: these guards, in this order, in these places. It works right
              up until the head in front of you is not the head in the demonstration — a flatter back, a lower ridge, a
              different texture — and then there is nothing to fall back on, because the sequence was never attached to
              a reason.
            </p>
            <p className="mt-3 leading-relaxed">
              A fade is a shape, and a small number of decisions produce it. Where the line sits, how short the bottom
              goes, what length it has to reach by the top. Fix those three and the ladder in between is not a matter of
              opinion — it follows. That is what this tool does: you name the result, and it shows you the working.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">The parietal ridge decides most of it</h2>
            <p className="mt-3 leading-relaxed">
              Run a hand up the side of the head and there is a corner where the side stops going up and starts going
              over. That is the parietal ridge, and it is the ceiling of every fade. A line below it has side left above
              it to blend into. A line on it has nowhere left to go, which is what makes a high fade high. A line above
              it is on a surface curving away from the clipper, which is why work up there stops reading as even no
              matter how carefully it was spaced.
            </p>
            <p className="mt-3 leading-relaxed">
              It is also the hardest thing to point at in a book, because it is in a different place on every head. The
              overlay marks it on the head actually in front of you, which is the one thing a diagram cannot do.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">What this tool does not do</h2>
            <p className="mt-3 leading-relaxed">
              It does not grade your work. It tracks the skull, not the hair — hair has no landmarks, it moves, and a
              single camera cannot judge depth through it. So the overlay is confident about where a line belongs and
              has no opinion at all about whether you hit it. Freeze a frame, hold it next to the target, and judge that
              yourself or with an instructor.
            </p>
            <p className="mt-3 leading-relaxed">
              It also loses the head at the back. Face tracking needs a face, so the overlay works from straight on
              round to roughly three-quarters and stops there. The decision it exists to help with — where the line
              lands relative to the ridge — is made at the temple and the side, which stay in view.
            </p>
            <p className="mt-3 leading-relaxed">
              And it does not know your client&apos;s texture. Curl pattern changes the relationship between the length
              you cut and the length that shows: tightly coiled hair can finish visibly shorter than the guard suggests,
              and unevenly so across one head. Treat the ladder as a starting spacing to be adjusted by eye, not a
              measurement.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-base font-bold text-amber-900">This is craft, not a state board rubric</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
              Guard ladders, line placement and the order of passes are conventions among barbers, not rules published
              by a regulator. No licensing board specifies them and no practical examination grades a fade against a
              protractor. For what an examination actually requires — the services, the kit and the scoring — go to the
              published requirements for your state rather than to this page.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-amber-900">
              <Link href="/texas-barber-state-board-practical-exam-kit-list" className="underline underline-offset-4">
                Texas practical exam kit list
              </Link>
              <Link href="/maryland-barber-practical-exam-kit-list" className="underline underline-offset-4">
                Maryland practical exam kit list
              </Link>
              <Link href="/ai-solutions" className="underline underline-offset-4">
                All tools
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-950">Privacy</h2>
            <p className="mt-3 leading-relaxed">
              The camera feed is processed entirely in your browser. No video, image or face data is uploaded to this
              site or anywhere else, and nothing is stored unless you choose to save a frozen frame to your own device.
            </p>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            graph(
              {
                // Deliberately no aggregateRating. Google's Software App rich
                // result requires one, and this page has no ratings to report —
                // inventing them to qualify is exactly the markup-asserting-what-
                // the-page-does-not-show failure. So this node is here to
                // describe the tool accurately, not to chase a rich result.
                "@type": "WebApplication",
                "@id": `${SITE_URL}${ROUTE}#app`,
                name: "AR Fade Trainer",
                url: `${SITE_URL}${ROUTE}`,
                applicationCategory: "EducationalApplication",
                operatingSystem: "Any device with a browser and a camera",
                browserRequirements: "Requires camera access and WebAssembly",
                isAccessibleForFree: true,
                inLanguage: "en-US",
                description:
                  "Pick a finished fade and the tool derives the line placement, guard ladder and order of passes, then draws them on a real head through the camera.",
                isPartOf: ref(WEBSITE_ID),
                publisher: ref(ORG_ID),
                author: authorSchema(),
              },
              {
                "@type": "WebPage",
                "@id": pageId(ROUTE),
                url: `${SITE_URL}${ROUTE}`,
                name: "AR Fade Trainer",
                isPartOf: ref(WEBSITE_ID),
                mainEntity: ref(`${SITE_URL}${ROUTE}#app`),
              },
              {
                "@type": "BreadcrumbList",
                "@id": breadcrumbId(ROUTE),
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                  { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE_URL}/ai-solutions` },
                  { "@type": "ListItem", position: 3, name: "AR Fade Trainer", item: `${SITE_URL}${ROUTE}` },
                ],
              }
            )
          ),
        }}
      />
    </main>
  )
}
