# Data Reels Agent — operating manual

The full workflow for turning a figure in this environment into a published
9:16 video on YouTube Shorts and Instagram Reels.

Written so the workflow survives losing every conversation, machine and person
that built it. If you are reading this cold, start at **How it fits together**
and then **The daily loop**.

Last verified against the live system: **19 Aug 2026.**

---

## 1. What this is for

Most content pipelines publish and forget. This one keeps every published video
joined to the **card** that produced it — the figure, how it was phrased, and
the question it asked. That join is the point: it is what lets you say *why*
one reel beat another and change the next batch accordingly. YouTube Studio has
the results but not the inputs.

The moat is not the video. It is that the figures come from data nobody else
holds — the TDLR licensee file, exam rosters, PSI bulletins, and our own
directory of shops, salons and schools.

---

## 2. How it fits together

```
  a figure in our data
        │
        ▼
  CARD SOURCES ──────────────────────────────────────────────
  scripts/shorts/card-sources.js      curated + regulator candidates
  scripts/shorts/derived-cards.js     TDLR lake, threshold-gated
  scripts/shorts/entity-cards.js      shops + salons, live queries
        │   { chip, stat, label, punch, source, question, tone }
        ▼
  RENDER ────────────────────────────────────────────────────
  scripts/podcast-visuals/shorts-news.html   the card + its timeline
  scripts/make_news_bed.js                    music, synthesised locally
  scripts/render_short_video.js               1080x1920 MP4, frame by frame
        │
        ▼
  QUEUE ─────────────────────────────────────────────────────
  scripts/shorts/queue_entity_cards.js   render → upload → insert
  scripts/shorts/make_thumbnails.js      cover image from 85% in
  table: publisher_queue                 position = order in line
  page:  /admin/content-publisher        watch every video before it goes
        │
        ▼
  PUBLISH ───────────────────────────────────────────────────
  app/api/cron/publish-content/route.ts  hourly; posts at 9am/2pm/7pm ET
        │                                 YouTube + Instagram together
        ▼
  MEASURE ───────────────────────────────────────────────────
  scripts/shorts/performance.js          joins results back to the card
```

---

## 3. The card — the whole contract

A card is a plain object. Anything that produces this shape becomes a video
with no renderer changes.

| Field | What it is | Max chars |
|---|---|---|
| `chip` | Category badge, e.g. `Texas · Salons` | — |
| `stat` | The number. The hero. Auto-fits the frame width | 12 |
| `label` | What the number means | 92 |
| `punch` | The turn — the line that makes it matter | 74 |
| `source` | Attribution. **Required** | 62 |
| `question` | The comment hook, revealed last | 58 |
| `tone` | `bad` (rose) or `good` (teal) | — |

Over the character limits the text wraps past the safe area and is hidden by
the platform's own chrome — silently. The generators refuse rather than render.

---

## 4. The rules that must not be broken

1. **A card without a source is never made.** Every figure on a public video
   carrying our mark has to be defensible when somebody screenshots it. This is
   enforced in code, not by convention.
2. **No invented figures.** Cards come from a data source or an approved
   regulator-diff candidate. If a number cannot be traced, there is no card.
3. **No personal detail, ever.** The shop and salon tables are CRM tables —
   they hold owner names, phones, emails and conversation history.
   `entity-cards.js` reads three columns via an **allowlist**, so a personal
   column added later is excluded by default rather than included until someone
   notices.
4. **Aggregates only. Never name a single business.** A count is a statement
   about a market. A named shop with a bad rating is a statement about a
   person's livelihood, and we have no standing to make it.
5. **Regulator-diff candidates need a human.** They arrive with `label`,
   `punch` and `question` null. A diff can say a value moved; it cannot say
   what that means, and inventing it is where a wrong claim enters.
6. **Rendering and publishing stay separate processes.** Rendering is cheap and
   reversible; publishing is neither. Nothing that renders may also publish.
7. **When the queue empties, stop.** Do not loop and repost. Reposting the same
   figures is how an automated channel becomes spam.

---

## 5. The daily loop

**Nothing needs doing daily.** The cron publishes on its own at 9am, 2pm and
7pm Eastern from whatever is at the front of the line.

The real work is **keeping the queue full** and **reading the results**.

```bash
# What is in the pool right now
node scripts/shorts/card-sources.js --list
node scripts/shorts/entity-cards.js --list

# Refresh figures that move on their own (threshold-gated)
node scripts/shorts/derived-cards.js --refresh

# Check the regulators for anything worth posting
node scripts/shorts/regulator-diff.js

# Render + upload + append to the back of the line
node scripts/shorts/queue_entity_cards.js --dry-run
node scripts/shorts/queue_entity_cards.js

# Fill in any missing cover images
node scripts/shorts/make_thumbnails.js

# How are they doing
node scripts/shorts/performance.js
```

Rendering takes about 80 seconds per video. A batch of ten is ~15 minutes.

---

## 6. How to report performance

Run `performance.js` and answer with what it *means*.

1. **Retention before views.** Views are mostly what the feed decided to do.
   Average view percentage is whether the card was worth watching. A reel with
   fewer views and higher retention is the better card — optimising for views
   alone leads straight to clickbait nobody finishes.
2. **Comments judge the question.** The question field exists to provoke
   replies. Views with no comments means the question failed even if the figure
   worked.
3. **Compare cards, not videos.** "The one that led with a count beat the one
   that led with a percentage" is actionable. "Video 3 did well" is not.
4. **Refuse unsettled data.** YouTube's numbers move for ~48 hours. Anything
   newer is flagged; say so rather than drawing a conclusion.
5. **Say when there isn't enough.** With two or three published there is no
   pattern, only noise.

When the data supports a change, make it in the card generators. That is where
a lesson becomes permanent.

---

## 7. Environment and credentials

| Variable | Used for |
|---|---|
| `YOUTUBE_CLIENT_ID` / `_SECRET` / `_REFRESH_TOKEN` | Upload + analytics |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Queue + storage |
| `CRON_SECRET` | Authorises the publishing cron |
| Instagram token | See the Instagram agent notes |

Needed in **two** places: `.env.local` for local rendering, and Vercel
production for the cron. **They drift.** A credential updated in one and not
the other fails at 9am into a log nobody reads.

**Storage buckets:** videos in `social-assets/shorts/`, covers in
`entity-photos/instagram/cover-*.jpg`. Both public.

---

## 8. Failures already hit, so they are not rediscovered

| Symptom | Cause |
|---|---|
| `invalid_client` on upload | The YouTube client secret was regenerated. Every refresh token issued under the old secret dies with it — re-run `scripts/test-youtube-oauth.js`. |
| `invalid_grant` after fixing the secret | Expected. That is the dead refresh token. Same fix. |
| Posts an hour early after November | A fixed UTC cron cannot track daylight saving. `publish-content` runs hourly and checks the Eastern hour instead, which is why it does not have this bug. |
| Cron/launchd fail with `EPERM` | The project sits under `~/Desktop`, which macOS protects from background jobs. Publishing runs on Vercel for this reason. |
| Stat renders as `15174` | The count-up animation strips thousands separators. Fixed, but any new numeric animation can reintroduce it. |
| A queue page shows no cover images | A column mapped in the lib but missing from the `select`. Fails silently — the page renders, just worse. |
| Performance report looks frozen | It was reading `shorts_queue`, the orphaned first-version table. It reads `publisher_queue` now. |

---

## 9. Known state, 19 Aug 2026

- **Live:** `publisher_queue`, `/admin/content-publisher`,
  `/api/cron/publish-content` (hourly, 9am/2pm/7pm ET, YouTube + Instagram).
- **Orphaned first version:** `shorts_queue`, `/admin/shorts-queue`,
  `queue_shorts.js`, `run_scheduled.js`, `publish_short.js`, `remind.js`,
  `shorts.cron`. Three early Shorts were published through it and its history
  has never been merged. Worth deciding: migrate those three rows, or delete
  the table and accept the gap.
- **The 9:16 safe area** (22% bottom, 14% right reserved for platform chrome)
  is a design assumption, still unverified against a real upload.
- **The music bed is synthesised locally and approved for production.** Do not
  replace it with a licensed track on the assumption it was temporary — being
  generated here means there is no Content ID surface at all.

---

## 10. Where the reasoning lives

Every script carries a header explaining *why* it is built the way it is,
including what was tried and rejected. Those headers are the real
documentation; this file is the map. If the two ever disagree, the code header
is newer — and this file should be corrected.
