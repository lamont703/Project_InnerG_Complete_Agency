# The Gaming agent

Games and interactive entertainment for the barber / beauty / wellness
audience, built on the licensing data this site already owns.

This document exists so the workflow survives the loss of any particular
session, machine, or assistant. It records not just what was built but **why
each decision went the way it did**, because most of them look arbitrary until
you know the failure they prevent.

The operational summary lives at `.claude/agents/gaming.md`. This is the long
form.

---

## 1. What this agent is actually for

ShearQuery is a directory and a licensing-reference site. It ranks for what
state boards require. A game here is never entertainment bolted on — it is a
**different presentation of a regulator's published requirements**, sitting on
the page that already ranks for them.

That produces one advantage and one constraint, and they are the same fact:

> The content must be true, because a student may act on it.

A game that teaches a requirement the board never set is worse than no game,
and worse than a wrong article — because a game *rewards you* for believing it.
Every rule in this document descends from that sentence.

---

## 2. The evaluation frame

### There are four audiences, not one

A game that lands for one bores the other three. Decide who it is for before
anything else.

| Audience | What they want | Game shape |
|---|---|---|
| Students | To pass the exam | Drills, prep, streaks |
| Working pros | Status, recognition | Leaderboards, skill ID |
| Shop owners | To not lose money | Business simulation |
| Clients | Ten minutes in a chair | Prize games, quick play |

### Rank ideas by how much existing data does the work

This is the single most useful filter. An idea that needs new content authored
is a **content project wearing a game costume** — it will stall on writing, not
on code.

The best ideas are a different view of a dataset already in the repo, because
the facts are already sourced, already reviewed, and already maintained by
whoever maintains the page.

### The backlog, as ranked

Preserved because the reasoning is the valuable part, not the list.

1. **Kit Packer** — *built.* Pack the practical exam kit against a clock. Kit
   lists are the highest-performing page type on the site, the data is
   structured per state and per licence, and the game mechanic and the
   educational value are the same thing: you win by knowing what to bring.
2. **Board Prep Streak** — daily written-exam questions, weighted to the PSI
   content outline, leaderboard by school. **Partially exists already** as
   `/tools/texas-barber-exam-practice-deck` and its cosmetology twin. Would
   give `/texas-school-leaderboard` and `/compare-schools` a reason to be
   visited daily instead of once.
3. **Chairside** — QR code in the shop, 2-minute game while waiting, prize
   configured by that shop. This is a fifth **ad product**, not really a game,
   and it is the easiest thing in the media kit to sell because the shop sees
   the return in the room. It also fixes the review-ask timing problem: the win
   screen fires post-service.
4. **Booth Rent Tycoon** — run a shop, set prices and chair rent, handle
   no-shows. The real payoff is that its calibration screen ("what does a chair
   rent for in your city?") is a data-collection funnel for the booth-rent
   coverage gap on `/compare-shops`. People will hand you comp data to make a
   game realistic that they would never type into a form.
5. **Guess the Fade** — image ID rounds. Pure social top-of-funnel, low build
   cost, no data dependency, but it does not compound the way 1 and 2 do.

### Unity was evaluated and rejected

Asked directly whether Kit Packer should be a Unity app connected to the site.
The answer was no, for reasons worth keeping:

- Unity WebGL renders to an opaque canvas — **zero indexable content**, which
  runs against the `.md` twin layer, the AI-crawler strategy, and the whole
  premise that this site's content is readable.
- The payload is megabytes against tens of kilobytes for the React version, on
  the site's top organic pages, mostly visited on phones.
- The mechanic is a timer and some state. Unity earns its weight for physics,
  3D, sprite pipelines — none of which this needs.
- It would break the single-source rule: `lib/kits/` is TypeScript that Unity
  cannot import, so the data would be serialised and drift silently the next
  time a bulletin is revised.

Unity (or more likely React Three Fiber, to stay in one codebase) becomes
arguable only for a genuinely spatial product — a 3D mannequin trainer, or
Booth Rent Tycoon with a rendered floor. Not for this.

---

## 3. Kit Packer — the design

### Three rounds, each a real way to lose points

1. **Pack** — 20 tiles from the tray in 60 seconds. Tap what belongs in this
   licence's kit. Missing a required item loses the points for every station
   that needed it. Packing a prohibited item ends the run immediately.
2. **Label** — for each item packed correctly, label it or don't. This is the
   round that earns the build: the rule is already a boolean on every item, and
   mislabeling is one of the cheapest ways to bleed points on the real exam.
3. **Order** — *designed, not built.* Put the stations in sequence. Texas runs
   11 in a mandated order and out-of-order work is not scored at all.

### The one hard problem, and the only acceptable answer

**A kit list contains only correct items. A game needs wrong ones.**

Inventing plausible distractors would put unsourced claims about state board
policy onto the site's best-performing organic pages. So there are exactly
three ways a wrong tile can exist, all derived rather than authored:

| Class | What it is | Why it is safe |
|---|---|---|
| Cross-licence | A real item from a sibling kit in the same state | It is genuinely real; set subtraction, no authoring |
| Prohibited | An item the bulletin names as forbidden | Carries the verbatim rule string that forbids it |
| Label flip | A right item with the wrong label state | Straight off the bulletin's own two lists |

`TileSource` is **non-optional** on every tile, and the review screen displays
it. A tile that cannot say where it came from cannot be rendered. The test
`kit-game.test.ts` asserts each prohibited entry's `rule` appears verbatim in
that kit's `rules` array, so a paraphrase fails the build rather than shipping
as an unsourced claim.

### Why prohibited items are declared, not parsed

`rules` holds prose: *"Aerosol products are not permitted"*, *"Cell phones are
not allowed in the practical room"*. Regex-extracting item names from sentences
would manufacture exactly the invented claims the whole design forbids. So each
prohibited item is written out explicitly **and** carries the rule verbatim.

### Why the deck is refused rather than degraded

`buildDeck` throws a `DeckError` for a licence with no `prohibited` list. A
game with no fatal tile is a game you cannot lose, and a game you cannot lose
teaches nothing about an exam you can.

The refusal is the feature. It converts "nobody has read this bulletin's rules
closely enough yet" from a silent omission into a build error. **Do not add a
fallback.**

### Why scoring is in items, not points

Texas barber publishes 163 points and a 115 pass mark. Using them was the
original plan and it was wrong: the item-to-station mapping is *ours*, an
editorial reading — the kit file says so in capitals. Computing "you would have
lost 34 points" would dress our inference as a board fact.

So the results screen scores in items and **quotes the real rule** ("you lose
the points for every step that needed a missing item"). Same stakes, actually
true.

Round three would be the exception: station order *is* published, so the point
totals could legitimately be used there.

### Why the deck is seeded

`mulberry32`, seeded per round. `Math.random()` cannot be seeded, and an
unseeded deck makes a shared score meaningless — "I got 17/20" is only worth
posting if the next person can play the same twenty tiles.

### Why tap-to-sort, not drag-and-drop

The audience is on a phone, often the night before an exam. HTML5 drag is
unreliable on touch. Two tap targets beat a drag every time here.

### Why the full list sits above the game

It is trivially copyable and that is deliberate. A student who scrolls up to
check the real kit list is doing exactly what the page exists for. **Cheating
at this game is studying.**

What stops "tap everything" from working is the prohibited tiles — pack the lot
and you pack the cheat sheet and score zero. That anti-exploit was not
designed; it fell out of the sourcing rule. The thing that made the game honest
also made it unbreakable.

---

## 4. The data architecture

Kit data lives in `lib/kits/`, one file per licence, each exporting a
`PracticalKit`.

```
lib/kits/types.ts     KitItem, KitGroup, ExamSection, ProhibitedItem, PracticalKit
lib/kits/index.ts     KITS registry, siblingKits(), the CA/MN prohibition
lib/kits/texas-*.ts   one file per Texas licence
lib/kit-game.ts       buildDeck, scorePack, scoreLabels, canRunLabelRound
```

### Why it was extracted

The four constants (`KIT_GROUPS`, `PROVIDED_ON_SITE`, `SECTIONS`, `RULES`) were
declared inside each `page.tsx`. Nothing else could read them, so any second
consumer would have to copy the data — and a copied kit list drifts silently
the next time a bulletin is revised, the way the January 1 2026 revision added
two stations to the barber exam.

`RULES` travels with the kit deliberately: it is the only record in this repo
of what a candidate is forbidden to bring, and it is meaningless separated from
the kit it governs.

### Two invariants that must not break

1. **Item labels are unique per kit and must not be reworded.** `KitChecklist`
   keys saved progress on the label string. A duplicate ticks in two places; a
   rename silently empties the saved list of anyone mid-pack.
2. **Kit page URLs do not change.** The Texas barber page is canonical-stuck to
   the old domain, and `kit-checklist.tsx` already carries a `PREVIOUS_KEYS`
   entry from the last time that path moved.

---

## 5. State and licence coverage

| Licence | Items | Label rule | Deck? |
|---|---|---|---|
| TX Class A Barber | 41 | per item | **built** |
| TX Cosmetology Operator | 52 | per group | needs `PROHIBITED` |
| TX Manicurist | 25 | per group | needs `PROHIBITED` |
| TX Esthetician | 24 | per group | needs `PROHIBITED` |
| TX Hair Weaving | 20 | per group | needs `PROHIBITED` |
| TX Eyelash Extension | 18 | per group | needs `PROHIBITED` |
| MS — four licences | 203 | **+ exact string** | needs extraction first |
| VA / OH / MD / TN | flat lists | none | round one only |
| Minnesota | — | n/a | **never** |
| California | — | no exam | **never** |

**Mississippi is the best unbuilt deck.** Its handbook publishes the exact
string an item must carry, on 64 items, which turns round two from a two-way
guess into a recall question — harder, and closer to what an examiner checks.

**California and Minnesota must stay structurally impossible.** California
licenses on a written exam alone (its bulletin contains "practical" zero times
across 26 pages). Minnesota's instructor exam is a teaching demonstration, not
a service exam. Both are asserted in `lib/kits/kits.test.ts`.

---

## 6. How to add a licence

The repeatable recipe. Roughly an hour, most of it reading.

1. **Fetch the bulletin.** PSI Candidate Information Bulletins live at
   `https://test-takers.psiexams.com/api/content/bulletin/{id}`; the IDs are
   mapped in `CLAUDE.md`. Re-verify the ID before trusting it.
2. **Confirm a practical exam exists at all.** Search the bulletin for
   "practical". Zero hits means no kit and no game — stop, and record why.
3. **Extract the kit** into `lib/kits/<state>-<licence>.ts` as a
   `PracticalKit`, carrying sourcing comments verbatim.
4. **Write the `PROHIBITED` array.** For each item the bulletin forbids, copy
   the **exact** rule string from that kit's `rules`. The test asserts it.
5. **Register it** in `lib/kits/index.ts`.
6. **Add the expected item count** to `kits.test.ts` so a future refactor
   cannot silently drop an item.
7. **Mark optional items** with `KitItem.optional`. Check the labels and hints
   for "optional".
8. **Mount `KitPacker`** below the checklist on that licence's kit page.
9. **Play it.** Both rounds, the fatal path, and the review screen.

---

## 7. Failure modes

Each of these actually happened.

**A summary of a rule is not the rule.** Prohibited items were nearly derived
by pattern-matching the prose in `rules`. That would have invented state board
claims out of sentence fragments. Declared explicitly, with the verbatim rule
attached.

**Tests pass on games that are wrong.** "Bowl for water (optional)" was dealt
as a required tile, so leaving it out scored against you — teaching a
requirement that does not exist. Every test passed. It was found in thirty
seconds of actually playing. **Play the game before calling it done.**

**A link can point at the page it is on.** "Check the full list" linked to
`kit.kitPath`, which *is* the page the game is embedded in. It navigated
nowhere. Now conditional on `usePathname()` — an in-page anchor when embedded,
a real link on a standalone route.

**An anchor lands under a fixed navbar.** Nothing in `globals.css` sets
`scroll-padding`, so `#kit-checklist` parked the heading underneath the header.
Fixed with `scroll-mt-28` matching the page's own `pt-28`.

**A refactor can silently lose data.** Moving six kits out of their page
components would have shown a shorter list and looked fine. The item counts
(52/41/25/24/20/18) are asserted against the pre-extraction numbers, which is
the only proof the move was lossless.

**`git push` pushes the branch, not your commit.** A push carried an unrelated
in-progress commit to the remote. Check `git log` between committing and
pushing when other work is in flight.

---

## 8. Verification protocol

Non-negotiable before calling any game done:

1. `npx tsc --noEmit`
2. `npx vitest run` — the sourcing guards are the point, not the count
3. `npm run build`
4. `npm run dev`, then **play it in a browser**: both rounds, the fatal path,
   every link, and the console for errors and hydration warnings
5. Confirm nothing above the fold changed on the host page

Steps 1–3 would have passed with the optional-item bug shipped. Step 4 is the
one that catches what matters.
