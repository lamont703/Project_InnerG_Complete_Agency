# The HairStyle Reels agent

A runbook. Everything needed to rebuild this workflow from nothing, in order,
with the reasons attached — because the reasons are what stop someone
"simplifying" a step that exists to prevent a specific silent failure.

Fifteen Reels have been produced this way (five on 2026-08-19 by hand, ten the
same day through the batch scripts). Every command below has been run.

## What the agent produces

A nine-second vertical Reel that walks six haircuts, one per beat, with the
style name and a number on screen. The caption asks the viewer to **comment the
number** they want.

That number is the whole point. **A business cannot DM anyone first on
Instagram** — the only documented opening is a *private reply* to a comment, one
message within seven days. So the post exists to produce a comment, the comment
buys one reply, and the reply asks which city they're in. Then we answer with
shops from the directory that do that cut.

A Reel that gets admired but not commented on is a failed Reel. Everything in
the format — the numbers, the "comment the number" line, six options rather than
one — serves that single mechanic.

Measured: a Reel reached **121 views** against **21** for a still image and
**16** for a data card. Video is not a preference here, it is the format that
works.

## The pipeline

Six stages. Stages 1–2 are browser work and cannot currently be scripted;
3–6 are one command each.

```
  1. Generate the grid      Google AI Studio, in a browser        ~40s
  2. Extract it             signed upload URL, page-side fetch    ~5s
  3. Render the Reel        scripts/instagram/reel_hairstyles.js  ~250s
  4. Render the cover       scripts/instagram/reel_thumbnail.js   ~5s
  5. Upload + queue         hairstyle-batch/queue_all.js          ~10s
  6. Publish                /api/cron/publish-content             automatic
```

**Rendering is the bottleneck, not generation.** A Reel is 270 Puppeteer
screenshots plus an ffmpeg pass. Ten Reels is roughly 45 minutes, so stage 3
must run detached and be polled — never in one foreground call.

---

## Stage 1 — Generate the grid

### The model, and why there is no API path

**Only Nano Banana 2 Lite (`gemini-3.1-flash-lite-image`) will run.** Nano
Banana Pro and Nano Banana 2 both refuse with *"This model requires a paid API
key"* — a consumer PRO subscription does not cover them. Every image model on
the Gemini API key returns `limit: 0`; image generation is not on the free tier
and needs billing enabled on Cloud project `gen-lang-client-0620705741`.

**If billing is ever enabled, stages 1 and 2 collapse into a script** and this
entire browser procedure can be deleted. At roughly $0.034 an image that is a
few dollars for a year of posting, and it is the single highest-value change
available to this agent. Until then, the browser is the only route.

### The seed

`public/manequin.jpeg` — a 2×3 grid of six white mannequin heads in a warm grey
studio, desaturated monochrome.

**Restyle an existing grid; never ask the model to invent one.** Prompting a
six-cell layout from a single head shot errored twice. Handing it a grid and
saying "replace the cuts" worked first time. Any previously generated grid works
as the seed, so the reference improves as the library grows.

### The prompt template

```
Using the mannequin grid image as the style reference, generate a new image in
exactly that style: same white mannequin heads, same warm grey studio
background, same desaturated monochrome treatment. IMPORTANT: exactly SIX heads
in a 2×3 grid, two columns and three rows, no more. All six are {GENDER}
{CATEGORY}: 1) {a}, 2) {b}, 3) {c}, 4) {d}, 5) {e}, 6) {f}. {FINISHING NOTE}
```

For women's grids, add **"Use FEMALE mannequin heads for this one."** and change
`same white mannequin heads` to `same studio mannequin heads`.

### Four prompt rules, each from a failure

1. **"exactly SIX heads in a 2×3 grid, two columns and three rows, no more."**
   Without it the model returns 3×3 grids of eight, which breaks the Reel
   template's fixed cell coordinates — the zoom lands between two heads.
2. **Restyle, never invent.** See above.
3. **Name the gender explicitly** — "MEN'S haircuts" or "WOMEN'S haircuts". It
   drifts otherwise. Women's grids do work from the male seed; that was tested
   before committing a batch to it.
4. **Set the textarea value via JS and verify the occurrence count before
   running.** Typing is fire-and-forget: an extension disconnect once made a
   prompt send twice in a single turn, and the doubled prompt is what produced
   a 3×3 grid of eight.

```js
const ta = document.querySelector('textarea');
const setter = Object.getOwnPropertyDescriptor(
  window.HTMLTextAreaElement.prototype, 'value').set;
setter.call(ta, PROMPT);
ta.dispatchEvent(new Event('input', { bubbles: true }));
if (ta.value.split('Using the mannequin grid').length - 1 !== 1)
  throw new Error('prompt landed more than once — refusing to run');
```

**AI Studio throws intermittent "An internal error has occurred."** Retry. It is
not the prompt.

**But a RUN of them is the quota, not flakiness.** On 2026-08-23 three grids
generated and then every subsequent request errored, in a thread AND in a fresh
one - so it is not thread length. Retrying after a pause produced a toast that
names it properly:

> Failed to generate content: permission denied. Please try again.

That is the same free-tier wall as the API, reached partway through a session
rather than at the first call. **Roughly three to five grids per session is what
the free allowance buys.** The red "internal error" in the transcript is the
misleading version of this message; the toast is the true one, and it only
appears briefly, so a run that stops producing images is quota until proven
otherwise. Enabling billing removes it.

---

## Stage 2 — Extract at full resolution

### Why it is not a download

The in-app Download opens a **native save dialog that automation cannot see**,
and a page screenshot drops the image to ~466px. Neither is usable.

Instead the page fetches its own blob and PUTs it to a **signed upload URL**:

```bash
node scripts/instagram/signed_upload.js --path=instagram/grid-w1-bobs.jpg
```

That returns a one-time URL with a two-hour expiry, scoped to exactly that one
object path. The page then uploads the blob to it directly. Result is full
resolution — around 848×1264 — straight into Supabase storage.

> **Never put the service-role key in a browser page.** A third-party tab can
> read it and it bypasses every RLS policy in the project. It is the single
> worst credential to expose and there is no way to scope it down. A signed URL
> is one path, short expiry, no key.

### The bug this stage exists to prevent

**Do not take the last `<img>` in the DOM.**

AI Studio's chat list is **virtualised** — it recycles nodes, so document order
stops matching visual order after a few turns. Selecting the last `<img>`
uploaded a grid from several turns earlier under the *new* grid's name, and
returned `ok: true` with correct full-resolution dimensions. Nothing about the
result looked wrong. `grid-m4-long.jpg` held the locs grid for an hour before
anyone noticed.

**There is no error, no exception, and nothing to alert on.** This is the most
dangerous failure mode in the whole agent, and it gets worse the more it is
automated. Three defences, all needed:

```js
// 1. Pick by greatest absolute Y, not document order.
const newest = () => [...document.querySelectorAll('img')]
  .filter(e => /^(blob:|data:image)/.test(e.src))
  .map(e => ({ el: e, y: e.getBoundingClientRect().top + window.scrollY }))
  .sort((a, b) => a.y - b.y).pop()?.el;

// 2. Refuse any src already uploaded, so a stale grab errors loudly.
if (img.src === window.__lastSrc) throw new Error('already grabbed this one');
```

**3. Render a labelled contact sheet of every grid and look at it before
building anything on the files.** Defences 1 and 2 are correctness fixes;
the contact sheet is what actually caught the bug. It is not optional.

### Two browser traps

**Generated images lazy-load.** An element out of view stays a broken
placeholder with `naturalWidth === 0`, so polling waits forever on a picture
that already finished. Scroll to the bottom first, and again every few polls.

**No long waits inside a single `Runtime.evaluate`.** CDP kills it at 45
seconds. A grabber that polled for 30s and then uploaded died with the upload
half-done and nothing reported back — the file was in storage but the driver
believed it had failed. Split the work: a fast `__ready()` predicate polled from
the driver, and a fast `__upload()` that assumes readiness.

Also: `await img.decode()` before reading the blob, or the *previous* image gets
uploaded.

---

## Stage 3 — Render the Reel

```bash
node scripts/instagram/reel_hairstyles.js \
  --in=experiments/hairstyle-grids-v2/w1-bobs.jpg \
  --out=experiments/hairstyle-reels-v2/w1-bobs.mp4 \
  --names='["Blunt bob","French bob","A-line bob","Inverted bob","Chin-length bob","Textured bob"]' \
  --headline="Six bobs, explained." \
  --cta="Comment the number and I'll send you shops that do it."
```

Output: 1080×1920, 9.00s, H.264 High + AAC, ~5MB.

### The edit, and why it is shaped this way

Eight beats, defined in `reel_hairstyles.html`:

| | Duration | What is on screen |
|---|---|---|
| Open | 1.4s | Whole grid, wide. Headline and CTA fade up. |
| Cuts 1–6 | 1.0s each | Zoom to one head, number badge and style name. |
| Close | 1.6s | Pull back to the whole grid, CTA returns. |

**The motion is the caption's argument.** The post asks for a number, so the
edit walks the six cuts *in order* with the number held on screen. A generic
push-in would look nicer and would teach the viewer nothing about what they are
being asked to do.

**Nine seconds because the bed is nine seconds** —
`reference/Podcast Visuals/Shorts/_bed-9s.m4a`. Cutting to the audio you
actually have beats picking a length and fading a track awkwardly. The bed is
trimmed to the clip with a 0.4s fade in and 0.6s fade out so it never ends
mid-phrase.

> **Open issue: the audio is wrong.** All fifteen Reels carry the news bed from
> the Shorts pipeline. It suits a statistics card and not a hairstyle montage.
> Pass `--audio=` to override once a licensed track exists.

### Batch rendering

```bash
node scripts/instagram/hairstyle-batch/render_all.js
```

Reads `scripts/instagram/hairstyle-batch/concepts.json` and **skips anything
already rendered**, so an interrupted run resumes rather than starting over.
Run it detached and poll for the output files.

---

## Stage 4 — Render the cover

```bash
node scripts/instagram/reel_thumbnail.js \
  --in=experiments/hairstyle-grids-v2/w1-bobs.jpg \
  --out=experiments/hairstyle-covers-v2/w1-bobs.jpg \
  --names='[...]' --headline="Six bobs, explained." --cta="..."
```

**Rendered, not frame-grabbed.** ffmpeg could pull frame 40 out of the finished
MP4 in one command, and it would be a JPEG of a compressed H.264 frame,
permanently tied to a video that has to exist first. Re-running the template at
`t=0.15` gives a clean 1080×1920 at full quality, and it can be made before the
Reel is.

**`t=0.15` is the end of the opening beat** — the whole grid is up, the headline
has faded in, nothing has started moving. Later frames are mid-zoom on a single
cut, which produces a cover showing one haircut instead of six.

**It fills the frame rather than fitting the width** (`--fill=0` to disable).
The bars a 3:4 source leaves in a 9:16 frame read as letterboxing in motion and
as a rendering fault when held still. The cost is that the bottom row of heads
is clipped by the frame edge.

---

## Stage 5 — Upload and queue

```bash
node scripts/instagram/hairstyle-batch/queue_all.js
```

Uploads each MP4 to `entity-photos/instagram/reel-{key}.mp4` and inserts a row
into `publisher_queue`:

| Column | Value |
|---|---|
| `item_key` | `hairstyles-{key}` — the upsert key |
| `title` | YouTube title, ends `#Shorts` |
| `label` | The headline sentence |
| `question` | The comment prompt |
| `video_url` | Public MP4 URL |
| `thumbnail_url` | Public cover JPEG URL |
| `caption` | Full Instagram caption **including hashtags** |
| `position` | Taken from the current tail, so nothing queued moves |
| `status` | `queued` |

**Upserts on `item_key`**, so a re-run after a partial failure repairs rather
than duplicates.

The cron prefers `row.caption` over the composed one, which is why the comment
prompt and hashtags survive into the published post.

---

## Stage 6 — Publish

Handled by `/api/cron/publish-content`. Nothing to run.

- **Three slots a day: 9:00 AM, 2:00 PM and 7:00 PM Eastern.**
- Posts to **YouTube Shorts and Instagram Reels together**, from one queue row.
- Visible and reorderable at **`/admin/content-publisher`** (drag, or ↑ ↓).

**It runs hourly and decides for itself** whether it is 9, 14 or 19 in New York.
Vercel cron schedules are UTC with no timezone to pin, so a fixed entry is
correct for eight months of the year and an hour early for the other four. The
cost is 24 invocations a day that mostly return immediately.

**The slot is claimed before anything uploads** — a primary-key insert into
`publisher_slot_claims`, so a retry or an overlapping deploy loses the race in
Postgres rather than in a check-then-act window.

**One platform can succeed while the other fails.** The row records both
outcomes and the status becomes `partial`. Calling a YouTube-only publish
"published" hides a missing Reel; calling it "failed" invites a re-post that
duplicates the Short.

### Thumbnails: the platforms are not symmetric

| | Supported? | How |
|---|---|---|
| **Instagram Reels** | **Yes** | `cover_url` on the REELS container |
| **YouTube Shorts** | **Effectively no** | `thumbnails.set`, attempted best-effort |

**Instagram**: JPEG only, under 8MB, sRGB, 9:16 or it crops to the middle
rectangle. Instagram cURLs the URL itself, so it must be publicly reachable.
Sending `thumb_offset` as well is pointless — Meta ignores it when `cover_url`
is present. A non-JPEG cover is dropped *before* the call, because a bad
container is accepted and only refused at publish, minutes of transcoding later.

**YouTube**: Google's help page states custom thumbnails for Shorts *"are
currently only available to add in YouTube Studio on a computer"*, and there is
an open feature request to expose it through the API. The call is made anyway —
the method is documented for videos and the channel is verified — but its
failure is swallowed. Note the **2MB ceiling is a quarter of Instagram's**, so a
cover can pass one and fail the other.

---

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Grid has eight heads in 3×3 | Prompt sent twice, or the "exactly SIX" clause missing | Verify occurrence count before running |
| Uploaded grid is the wrong one | Took last `<img>` in a virtualised list | Select by greatest Y; refuse a repeated `src`; check the contact sheet |
| Grab hangs on a finished image | Image out of view, lazy-loaded, `naturalWidth 0` | Scroll to bottom, then poll |
| Evaluate dies at 45s, upload half-done | Long wait inside `Runtime.evaluate` | Poll from the driver, not the page |
| Same image uploaded twice | Read the blob before `decode()` | `await img.decode()` first |
| "This model requires a paid API key" | Nano Banana Pro or 2 selected | Switch to Nano Banana 2 Lite |
| "An internal error has occurred", once | AI Studio flakiness | Retry; not the prompt |
| Every request errors after 3-5 grids | Free-tier quota exhausted | Wait for reset, or enable billing. Watch for the "permission denied" toast |
| Prompt sits unsent, no generation | Run `btn.click()` silently no-ops | Real click in the textarea, then cmd+Return; verify the textarea emptied |
| Reel publishes with no cover | Cover is PNG, or over the platform's ceiling | JPEG, under 2MB to satisfy both |
| Row sits at position 1 and nothing publishes | No `video_url` — flagged `unpublishable` | Render the video or remove the row |

---

## Open issues

1. **Per-cell style names are approximate.** The model reliably renders the
   *category* — bobs, undercuts, locs — but not each specific named cut, so a
   label reading "2. Buzz cut" can sit over a pompadour. Acceptable while a
   human reviews each grid; **a correctness problem the moment this runs
   unattended.** Number-only labels are the safe primitive if nobody is
   checking.
2. **The audio bed is wrong** for this format. See stage 3.
3. **Stages 1–2 need a browser.** Enabling billing on the Gemini project
   removes the entire browser procedure and every trap documented in it.

## Files

| Path | What it is |
|---|---|
| `public/manequin.jpeg` | The original seed grid |
| `scripts/instagram/reel_hairstyles.js` / `.html` | Reel renderer and template |
| `scripts/instagram/reel_thumbnail.js` | Cover renderer, same template at `t=0.15` |
| `scripts/instagram/signed_upload.js` | Mints the one-time upload URL |
| `scripts/instagram/hairstyle-batch/concepts.json` | The set: key, headline, six names |
| `scripts/instagram/hairstyle-batch/render_all.js` | Batch render, resumable |
| `scripts/instagram/hairstyle-batch/queue_all.js` | Upload and queue, idempotent |
| `lib/instagram-publish.ts` | Container-then-publish, `cover_url` |
| `app/api/cron/publish-content/route.ts` | The three-slot publisher |
| `app/admin/content-publisher/` | The board |
