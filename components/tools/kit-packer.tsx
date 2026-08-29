"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { membershipPath } from "@/lib/audiences"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Cloud,
  Clock,
  Play,
  RotateCcw,
  Tag,
  TagIcon,
  Trophy,
  XCircle,
} from "lucide-react"
import {
  buildDeck,
  scoreLabels,
  scorePack,
  type KitDeck,
  type KitTile,
  type PackResult,
} from "@/lib/kit-game"
import type { PracticalKit } from "@/lib/kits/types"
import {
  trackKitPackerStart,
  trackKitPackerPackComplete,
  trackKitPackerLabelComplete,
  trackKitPackerRetry,
  trackKitPackerSignupInvite,
} from "@/lib/analytics"

type Phase = "idle" | "pack" | "label" | "results"

const TILE_COUNT = 20
const SECONDS = 60

/**
 * Kit Packer — round one packs the bag, round two applies the label rule.
 *
 * WHY IT SITS BELOW THE CHECKLIST AND STARTS COLLAPSED. This mounts on the
 * site's best-performing organic pages. Nothing above the fold may change and
 * nothing may run before the visitor asks for it — the kit list is the reason
 * they came, and the game is a bonus that must not tax it. The deck is not
 * built until Start is pressed.
 *
 * NO DRAG AND DROP. The audience is on a phone, often the night before an
 * exam. Tap-to-sort is reliable on touch; HTML5 drag is not.
 *
 * ON CHEATING: the full kit list is on the same page, so a player can scroll up
 * and copy it. That is deliberately not defended against — a student checking
 * the real list is doing the thing this page exists for. What stops "pack
 * everything" from working is the prohibited tiles, which end the run.
 */
export function KitPacker({ kit, siblings }: { kit: PracticalKit; siblings: PracticalKit[] }) {
  // Whether the game is embedded on its own kit list page, which decides
  // whether "Check the full list" navigates or scrolls.
  const pathname = usePathname()
  const onKitPage = pathname === kit.kitPath

  const [phase, setPhase] = useState<Phase>("idle")
  const [seed, setSeed] = useState<number>(1)
  const [deck, setDeck] = useState<KitDeck | null>(null)
  const [packedIds, setPackedIds] = useState<Set<string>>(new Set())
  const [remaining, setRemaining] = useState(SECONDS)
  const [endedOn, setEndedOn] = useState<KitTile | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [labelAnswers, setLabelAnswers] = useState<Map<string, boolean>>(new Map())
  const [labelIndex, setLabelIndex] = useState(0)
  const startedAt = useRef<number>(0)

  const packResult: PackResult | null = useMemo(
    () => (deck ? scorePack(deck, packedIds) : null),
    [deck, packedIds],
  )

  const labelQueue = useMemo(
    () => (packResult ? packResult.packed.filter((t) => t.correct && t.mustLabel !== undefined) : []),
    [packResult],
  )

  const labelResult = useMemo(
    () => scoreLabels(labelQueue, labelAnswers),
    [labelQueue, labelAnswers],
  )

  // ── round one ends: on the clock, on a prohibited tile, or on Done ───────
  const finishPack = useCallback(
    (built: KitDeck, ids: Set<string>, fatal: KitTile | null, ranOut: boolean) => {
      const result = scorePack(built, ids)
      trackKitPackerPackComplete({
        licence: built.slug,
        seed: built.seed,
        correct: result.correctCount,
        required: result.requiredCount,
        wrong: result.wrong.length,
        fatal: fatal !== null,
        time_taken_ms: Date.now() - startedAt.current,
        timed_out: ranOut,
      })
      // A prohibited item ends the exam, so it ends the run — there is no
      // label round to play once you have been dismissed.
      setPhase(fatal || !built.labelRound || result.correctCount === 0 ? "results" : "label")
    },
    [],
  )

  useEffect(() => {
    if (phase !== "pack" || !deck) return
    if (remaining <= 0) {
      setTimedOut(true)
      finishPack(deck, packedIds, null, true)
      return
    }
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, remaining, deck, packedIds, finishPack])

  const start = (nextSeed: number) => {
    const built = buildDeck(kit, siblings, { seed: nextSeed, tileCount: TILE_COUNT, seconds: SECONDS })
    startedAt.current = Date.now()
    setSeed(nextSeed)
    setDeck(built)
    setPackedIds(new Set())
    setEndedOn(null)
    setTimedOut(false)
    setLabelAnswers(new Map())
    setLabelIndex(0)
    setRemaining(SECONDS)
    setPhase("pack")
    trackKitPackerStart({ licence: built.slug, seed: nextSeed, tile_count: built.tiles.length })
  }

  const toggle = (tile: KitTile) => {
    if (!deck || phase !== "pack") return
    const next = new Set(packedIds)
    if (next.has(tile.id)) {
      next.delete(tile.id)
      setPackedIds(next)
      return
    }
    next.add(tile.id)
    setPackedIds(next)
    if (tile.fatal) {
      setEndedOn(tile)
      finishPack(deck, next, tile, false)
    }
  }

  const answerLabel = (tile: KitTile, shouldLabel: boolean) => {
    const next = new Map(labelAnswers)
    next.set(tile.id, shouldLabel)
    setLabelAnswers(next)
    if (labelIndex + 1 >= labelQueue.length) {
      const final = scoreLabels(labelQueue, next)
      trackKitPackerLabelComplete({
        licence: deck!.slug,
        seed: deck!.seed,
        correct: final.correct,
        total: final.total,
      })
      setPhase("results")
    } else {
      setLabelIndex((i) => i + 1)
    }
  }

  const retry = (from: "pack" | "label" | "results") => {
    trackKitPackerRetry(kit.slug, from)
    start(seed + 1)
  }

  // ── idle ────────────────────────────────────────────────────────────────
  if (phase === "idle" || !deck || !packResult) {
    return (
      <section className="no-print mb-6 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="mb-1 text-xl font-black text-slate-900">
              Can you pack this kit in {SECONDS} seconds?
            </h2>
            <p className="text-sm font-medium text-slate-500">
              {TILE_COUNT} items come out of the tray — some belong in your {kit.licence} kit, some
              belong to a different licence, and some are banned from the exam room outright. Pack
              the right ones. Pack a banned one and you&apos;re done, the same way you would be on
              exam day.
            </p>
          </div>
          <button
            onClick={() => start(Math.floor(Date.now() / 1000) % 100000)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-700"
          >
            <Play className="h-4 w-4" />
            Start
          </button>
        </div>
      </section>
    )
  }

  // ── round one: pack ─────────────────────────────────────────────────────
  if (phase === "pack") {
    const pct = (remaining / SECONDS) * 100
    return (
      <section className="no-print mb-6 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-900">Pack your kit</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">{packedIds.size} packed</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-sm font-black tabular-nums ${
                remaining <= 10 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {remaining}s
            </span>
          </div>
        </div>

        <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              remaining <= 10 ? "bg-red-500" : "bg-emerald-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {deck.tiles.map((tile) => {
            const on = packedIds.has(tile.id)
            return (
              <li key={tile.id}>
                <button
                  onClick={() => toggle(tile)}
                  aria-pressed={on}
                  className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    on
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {on ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                  )}
                  <span className="font-semibold">{tile.label}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <button
          onClick={() => finishPack(deck, packedIds, null, false)}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50"
        >
          Done packing
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </section>
    )
  }

  // ── round two: label ────────────────────────────────────────────────────
  if (phase === "label") {
    const tile = labelQueue[labelIndex]
    return (
      <section className="no-print mb-6 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-900">Label it, or don&apos;t</h2>
          <span className="text-xs font-bold text-slate-500 tabular-nums">
            {labelIndex + 1} of {labelQueue.length}
          </span>
        </div>
        <p className="mb-5 text-sm font-medium text-slate-500">
          The bulletin publishes two lists — products that must be labeled in English, and tools
          that must not be. Labeling the wrong item loses points.
        </p>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-center">
          <p className="text-lg font-black text-slate-900">{tile.label}</p>
          {tile.hint && <p className="mt-1 text-xs text-slate-500">{tile.hint}</p>}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => answerLabel(tile, true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-4 text-sm font-black uppercase tracking-widest text-amber-800 transition-colors hover:bg-amber-100"
          >
            <Tag className="h-4 w-4" />
            Must be labeled
          </button>
          <button
            onClick={() => answerLabel(tile, false)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-4 text-sm font-black uppercase tracking-widest text-slate-600 transition-colors hover:bg-slate-50"
          >
            <TagIcon className="h-4 w-4" />
            Do NOT label
          </button>
        </div>
      </section>
    )
  }

  // ── results ─────────────────────────────────────────────────────────────
  const { correctCount, requiredCount, missed, wrong } = packResult
  const clean = !endedOn && missed.length === 0 && wrong.length === 0

  return (
    <section className="no-print mb-6 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
      <h2 className="mb-4 text-xl font-black text-slate-900">
        {endedOn ? "That would have ended your exam" : clean ? "Clean bag" : "How you packed"}
      </h2>

      {endedOn && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-black text-red-900">
              You packed &ldquo;{endedOn.label}&rdquo;.
            </p>
            {endedOn.source.kind === "prohibited" && (
              <p className="mt-1 text-xs leading-relaxed text-red-800">
                {endedOn.source.rule}
              </p>
            )}
          </div>
        </div>
      )}

      {clean && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-black text-emerald-900">
            Every required item in, nothing that shouldn&apos;t be there. That is the bag you want.
          </p>
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Packed</p>
          <p className="text-2xl font-black tabular-nums text-slate-900">
            {correctCount} <span className="text-base text-slate-400">/ {requiredCount}</span>
          </p>
        </div>
        {deck.labelRound && labelResult.total > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Label rule
            </p>
            <p className="text-2xl font-black tabular-nums text-slate-900">
              {labelResult.correct} <span className="text-base text-slate-400">/ {labelResult.total}</span>
            </p>
          </div>
        )}
      </div>

      {timedOut && (
        <p className="mb-4 text-xs font-bold text-amber-700">
          The clock ran out. On exam day, anything not completed in its allotted time is not scored.
        </p>
      )}

      {missed.length > 0 && (
        <Review
          title={`Left in the tray (${missed.length})`}
          tone="amber"
          rows={missed.map((t) => ({
            label: t.label,
            note: t.source.kind === "required" ? t.source.group : undefined,
          }))}
          footer="You lose the points for every step that needed a missing item."
        />
      )}

      {wrong.filter((t) => !t.fatal).length > 0 && (
        <Review
          title={`Doesn't belong in your kit (${wrong.filter((t) => !t.fatal).length})`}
          tone="slate"
          rows={wrong
            .filter((t) => !t.fatal)
            .map((t) => ({
              label: t.label,
              note:
                t.source.kind === "cross-licence"
                  ? `Real item — from the ${t.source.fromLicence} kit, not yours`
                  : undefined,
            }))}
        />
      )}

      {labelResult.missedLabels.length > 0 && (
        <Review
          title={`Label rule missed (${labelResult.missedLabels.length})`}
          tone="amber"
          rows={labelResult.missedLabels.map((m) => ({
            label: m.label,
            note: m.shouldLabel ? "Must be labeled in English" : "Must NOT be labeled",
          }))}
        />
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => retry("results")}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          New round
        </button>
        {/* Embedded on the kit page itself, kit.kitPath is the page you are
            already on — a link that navigates nowhere. Scroll to the checklist
            instead. On the standalone /kit-packer/ route the same control has
            to navigate for real, so both cases are handled rather than the
            link being dropped. */}
        <a
          href={onKitPage ? "#kit-checklist" : kit.kitPath}
          className="text-xs font-black uppercase tracking-widest text-slate-500 underline underline-offset-4 hover:text-slate-900"
        >
          Check the full list
        </a>
      </div>

      {(missed.length > 0 || labelResult.missedLabels.length > 0) && (
        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-2.5">
          <Cloud className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="text-xs font-bold text-blue-900">
            Save what you keep forgetting.
          </span>
          <Link
            href={membershipPath("student")}
            onClick={() =>
              trackKitPackerSignupInvite({
                licence: kit.slug,
                missed: missed.length + labelResult.missedLabels.length,
              })
            }
            className="text-xs font-black text-blue-700 underline underline-offset-2"
          >
            Create a free account
          </Link>
          <span className="text-xs text-blue-800">and your weak spots follow you to the exam.</span>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
        Every item and rule above comes from the {kit.document}. Confirm against your own bulletin
        before your exam date.
      </p>
    </section>
  )
}

function Review({
  title,
  tone,
  rows,
  footer,
}: {
  title: string
  tone: "amber" | "slate"
  rows: { label: string; note?: string }[]
  footer?: string
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50/60"
      : "border-slate-200 bg-slate-50"
  return (
    <div className={`mb-3 rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-600">{title}</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-2 text-sm">
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="text-slate-700">
              {r.label}
              {r.note && <span className="block text-[11px] text-slate-500">{r.note}</span>}
            </span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-2 text-[11px] text-slate-500">{footer}</p>}
    </div>
  )
}
