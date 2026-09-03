# Project Guidelines

- Build: `npm run build`
- Start dev server: `npm run dev`

## Branch policy — read before any git operation

**All work happens on `barber-intel-diagnostic-v2`. Never commit to, push to, or
switch to any other branch, including `main`.**

`main` is the production branch. Changes reach it through a pull request from
`barber-intel-diagnostic-v2`, reviewed by a human — never by an assistant
pushing directly.

### The specific mistake this prevents

Checking out `main` to look at something and then continuing to work there. The
commits land on `main`, and the trap is that this looks like it worked:
`git push origin barber-intel-diagnostic-v2` pushes *that branch's* tip
regardless of where `HEAD` is, so the push reports success while the new commit
stays behind on `main`. It has happened twice in this repo.

### Rules

1. **Check the branch before committing.** `git rev-parse --abbrev-ref HEAD`
   must print `barber-intel-diagnostic-v2`.
2. **Never `git checkout main`.** To read a file from `main`, use
   `git show origin/main:path/to/file` — no checkout needed.
3. **Verify a push landed** by confirming the commit is on the remote branch —
   `git log --oneline origin/barber-intel-diagnostic-v2 -1` — not by the push
   command's exit code.
4. **Never use `I_REALLY_MEAN_IT=yes`.** That override exists for a human at a
   keyboard, not for an assistant.

Git hooks in `.githooks/` enforce this (`core.hooksPath` is set to that
directory). They refuse commits and pushes on any other branch. If a hook
refuses an operation, that is the policy working — do not work around it, and do
not disable or edit the hooks to proceed. Say what was blocked and stop.

If a clone doesn't have the hooks active, run:

    git config core.hooksPath .githooks

## Video formats — say the name, not the machinery

**Five formats. Call them by name. `lib/video-type.js` is the registry and the
one place that prices them.**

| id | say | what it is | length | cost |
|---|---|---|---|---|
| `lookbook` | **Lookbook** | six looks panned across a grid, comment-the-number CTA | 9s | free |
| `figure` | **Data Reel** | one number from our own data, animated | 9s | free |
| `hottake` | **Hot Take** | opinion on an evergreen topic, one continuous avatar take | 30s | ~$1.16 |
| `newsdesk` | **News Desk** | reaction to a headline that actually broke | 90s | ~$1.31 |
| `reaction` | **Reaction** | cutting between somebody else's clip and our commentary | 60s | ~$1.12 |

### Why the names changed

They used to be `grid` / `data` / `avatar` / `news`, named after their
machinery, and two of them could not be told apart in conversation: **a Hot
Take and a News Desk are BOTH avatar videos, and both are about something
topical.** "How did the avatar video do?" did not identify a video. These names
say what the viewer gets, so no two overlap.

Old ids still resolve — `LEGACY_VIDEO_TYPE_IDS` in `lib/video-type.js` maps
them forward. That map is deletable once nothing writes the old spellings; it
is not a second vocabulary to keep alive.

### The distinction that actually matters

- A **Hot Take** is ONE continuous 30s HeyGen take on an evergreen topic,
  written from a queue card by `scripts/render_queued.js`, then edited (silence
  cut, b-roll, captions, music). It renders from the board's Render button.
- A **News Desk** is a reaction to a story that broke, ~90s, from a
  hand-written script JSON, run by `scripts/render_news_short.js`. The avatar is
  bought only for the beats that need a face — the open, the pivot, the thesis,
  the close — and the middle is that same narration over the article screenshot
  and b-roll. **It does not render from a queue card**, and `render_queued.js`
  refuses it explicitly rather than falling through and buying a Hot Take.

`newsdesk` AND `reaction` are therefore excluded from `AGENT_VIDEO_TYPE_IDS`:
both render from a hand-written spec carrying source files and in/out points,
none of which exists on a queue card, so the research agent must not be able to
queue an idea no button can render.

THE EMAIL AGENT'S SET IS THE INVERSE, and the two are easy to confuse.
`AGENT_VIDEO_TYPE_IDS` is what can be queued as a CARD. The email agent writes
SPECS, so its spec formats are exactly the ones excluded there — see
`SPEC_PROFILES` in lib/video-agent/interpret.ts, which reads them off `PROFILES`
rather than restating the list. Adding a format means
adding it to `VIDEO_TYPES`, and only moving it into the agent's list once it can
render from a card.

### Two avatars, one voice

`HEYGEN_AVATAR_ID` (grey hoodie) is the Hot Take. `HEYGEN_NEWS_AVATAR_ID`
(black hoodie) is the News Desk. Different talking photos on purpose, so the
formats differ on sight as well as by name. Both use the same
`HEYGEN_VOICE_ID`. **Never point one format at the other's avatar id.**

## Making a News Desk — two commands, and the config decides everything else

**`lib/newsdesk-config.js` is the format. Do not pass settings at the prompt.**

    node scripts/render_news_short.js  "reference/AI News Video Shorts/<spec>.json"
    node scripts/publish_news_short.js "reference/AI News Video Shorts/<spec>.json"

Add `--dry` to either. The first buys the HeyGen avatar and assembles the cut;
the second burns captions, lays the music bed, uploads and queues the row.

### The spec IS the episode

One file carries `slug`, `title`, `caption`, `cta_word`, the article screenshot
path, and the segments. Each segment is `mode: "avatar" | "voice"`, and a voice
segment takes `visual: "headline" | "chart" | "broll"` — b-roll segments carry
`tags` that are looked up in the library, never a free-text query.

`publish_news_short.js` refuses a spec with no title or caption, because those
are part of the episode rather than of the run.

### What is pinned, and why touching it is deliberate

`lib/newsdesk-config.test.ts` asserts the agreed values, so changing the format
means editing a test — visible in review — rather than typing a different flag.
Pinned: the $1.50 cap, the 6s visual-hold cap, both chart crops, the avatar
composite, the encode ladder, the caption style, the music bed, and the bucket.

- **The budget gate runs BEFORE anything is bought.** Over the cap, the render
  exits 1. `--over-budget` is the override and has to be typed.
- **The estimate uses a MEASURED 175 wpm**, the slow end of 174-197 observed
  across the two shipped episodes. The old assumed 165 wpm over-predicted by
  13% and would have refused episode one, which really cost $1.32 — and a gate
  that blocks work it should allow gets switched off. Re-measure as episodes
  accumulate.
- **One music bed for the series**, so it sounds like one show. Choosing a track
  at the prompt is how episode three sounds like a different channel.

### The failure that is silent, and stays fixed

The renderer writes `<slug>.words.json` rebased onto the ASSEMBLED timeline.
Captions driven off `narration.words.json` produce **an uncaptioned video and
exit 0** — three separate reasons: it is a bare array where add_captions.js
reads `.words`, it carries `<start>`/`<end>` marker tokens, and its timings are
on the narration clock, which still contains the pauses between segments that
the cut removed. `publish_news_short.js` refuses to run without the rebased
file for exactly this reason.

## Requesting a video by email — what it will and will not do

**Mail claudedawg113@gmail.com. It replies with a spec, a cost and a six-digit
code, and renders nothing until that code comes back.** The allowlist is a spam
filter; the code is the consent. A From: header is spoofable and every approval
spends real money.

`app/api/cron/video-agent/route.ts` polls and proposes. `scripts/video_agent_worker.js`
runs locally and is the only thing that spends — it never passes `--over-budget`.

### What each format needs from the email

| format | needs |
|---|---|
| `hottake` | nothing but the argument |
| `newsdesk` | the article screenshot attached |
| `reaction` | the clip attached, or a Drive link |
| `lookbook` | a 2x3 grid image attached, plus six style names |
| `figure` | **the figure itself, stated in the email** |

### Data reels are deliberately assisted, not autonomous

**The agent will not go and find a figure.** Asking for "data reels on data we
have not shared yet" gets a refusal that explains why, and that is the intended
behaviour rather than a gap to close.

Choosing a figure means checking what has already run, and checking that a
column means what its name suggests. Both matter: `continuing_education_flag`
splits 107,677 / 324,151 and nothing states whether it means required,
completed or outstanding — see `scripts/shorts/licence-cards.js` — and school
licences are stored twice in the raw lake, so a row count says 514 schools where
there are 257. Either of those would have gone on screen under a source line.

So: state the figure in the email, or ask in a live session and do the analysis
properly. The rule the prompt enforces is that **numbers come from verified
queries, words come from the model** — never the other way round.

### The agent only knows what it can READ. Three refusals come from that.

It is a text-and-images model behind an email address. It cannot open a link, it
cannot watch a video, and it cannot query the database — and each of those, left
unguarded, produced a complete confident spec with a live approval code on it:

| asked for | what came back |
|---|---|
| "read the article at this URL" | a full News Desk of invented figures, from the headline alone |
| "transcribe this video and react to it" | filler that fits any clip — "a lot to unpack", "let's break it down" |
| "data reels on data we have not shared" | (guarded first) — would have been an invented figure under a source line |

All three now refuse and say what to send instead. **The tell is always the
same: prose that would read identically if the source were a different article,
a different clip or a different number.** When adding a format, ask what the
model would have to KNOW to write it, and whether an email can carry that.

### Two more things a live session is needed for

Generating a Lookbook grid from a concept, and generating b-roll a spec needs
that `broll_assets` does not already hold. Higgsfield is an assistant tool, not
a library — no API key exists in this repo. The worker pre-flights both before
claiming a job, because `render_news_short.js` buys the avatar in segment order
and would otherwise pay for a render that dies at a b-roll segment.

## B-roll — search the library before you generate anything

**`broll_assets` is the library and `lib/broll-library.js` is the way in. Call
`findClips()` BEFORE generating.** Higgsfield generations cost credits; a
library that is only ever written to is an expense report, and the saving is
entirely in the read path.

- **Search by TAGS, never by prompt.** A generation prompt is a paragraph
  written for a video model and no two are alike, so matching on it finds
  nothing while the library sits full. Tags are what is visibly IN the clip —
  `barbershop`, `phone`, `hands`, `night` — chosen so a later search can
  describe the shot it needs.
- **Files go to `entity-photos`, not `social-assets`.** That bucket caps at 5MB
  and b-roll is routinely larger.
- **`credits` and `use_count` are the point.** Cost makes reuse an argument
  rather than a preference; use_count is the only evidence the library is being
  pulled from rather than just filled.

### Generating new clips

`kling3_0_turbo` at 1080p, 9:16, 5s = **10 credits** — native 1080×1920, which
is what the renders output, so no upscale. Veo 3.1 Lite is cheaper (6 credits
for 6s) but its resolution is fixed and undocumented. Do NOT price these from
memory or from blog posts: preflight with `get_cost: true`, which submits
nothing. Published third-party numbers for Veo 3.1 were off by roughly 7×
against the Lite variant we actually use.

Prompt for **no legible text in frame** — generated on-screen text is where
these models fall apart. Kling Turbo emits an audio track regardless; the
renderer maps only our narration, so it is discarded.

## Lookbook grids — generate at 2:3, and never let a crop reframe them

**Generate every grid at 2:3. 1696x2528 lands on the reel template's cell aspect
exactly and needs no crop at all.** With Higgsfield's `nano_banana_pro`, pass
`aspect_ratio: "2:3"` — omit it and you get a square 2048x2048, which is the
failure below.

`reel_hairstyles.html` pans to fixed normalised points, so what matters is the
CELL aspect: (848/2)/(1264/3) = 1.0063. `fitGrid()` in
scripts/video_agent_worker.js corrects a near-miss by cropping the width.

### The failure, because it produced a valid file and no error

A centred crop only preserves the grid when each head sits in the MIDDLE of its
cell. On a square source they do not — the heads lean toward the outer edge of
their column — so taking 33% off the width sliced every head in half. ffmpeg
succeeded, the JPEG opened fine, and the reel would have panned across six
half-heads. Nothing anywhere said the picture was wrong.

`fitGrid()` now refuses any fit that would cut more than 12% of the width and
says to regenerate at 2:3. A crop that large is not a fit, it is a reframe.

### Two prompt rules that carried over, both still earning their place

- **Say "exactly SIX heads in a 2x3 grid, two columns and three rows, no more"**,
  and add that each head must be CENTERED in its cell with even margin.
- **Every cell must differ on CUT as well as colour.** A men's highlights grid
  came back as six near-identical brown-with-blonde side-parts and was thrown
  away — the same low-contrast failure as the buzz-cut batch. Naming a different
  haircut per cell alongside the colour fixed it in one retry.
- **Label the cells from the RENDERED grid, never from the prompt.** The model
  renders the category reliably and the specific named cut only sometimes.

## pixel_events claims — two things inflate it, and both look like demand

**Before publishing any figure from `pixel_events`, subtract our own traffic and
establish whether a search was TYPED or TAPPED.** Both traps produce numbers
that are real, reproducible, and describe us rather than the audience.

### 1. Roughly 37% of events are internal

49 visitor_ids have hit `/admin`, `/pixel-analytics` or `/account`. They account
for 20,797 of 55,659 events — **37.4%**, measured 2026-09-03. Filter by
`visitor_id`, not by path: excluding admin *pages* still leaves that person's
browsing of the public site in the numbers.

### 2. The top search terms are our own suggestion chips

`app/search/page.tsx` renders canned queries as tappable chips, and a tap fires
`search_executed` with the chip text in `metadata.query` — indistinguishable
from typing it. The five most common "searches" on this site are all chips.

**The chip set has been edited over time, so historic chip text is NOT in the
current source and cannot be subtracted by grepping.** That is what makes this
unfixable rather than merely fiddly: there is no way to reconstruct which chips
were live on a given date. A "top search term" claim from this table is
therefore not publishable, and no amount of care makes it so.

What IS safe is the shape a chip cannot have — a query of three words or fewer
with no question mark. Chips are long natural-language questions; "cypress" and
"buzzards barbershop" are people.

**The gap is not small, which is the point.** Chip-inflated data says 18.9% of
searches are about booth rent or hiring. Restricted to queries that cannot be a
chip, it is **0.8%** — a 24x overstatement of an entire audience segment, and it
would have been published as a finding about what barbers want.

## TDLR raw counts — schools are in TWO source datasets

`tdlr_licensees_raw` holds one row per licence for every type EXCEPT schools,
which appear under both `7358-krk7` and `9d9z-ebct`. So a plain count of
`Cosmetology Private School` returns **1,280 when the real number is 640** —
exactly double, which is what makes it convincing rather than obviously wrong.

`tdlr_license_type_summary` already dedupes and is the number to trust. When
counting off the raw table, count `distinct license_number`, never rows. Every
other licence type checked has row count equal to distinct licences, so a
spot-check on one type will not reveal this.

## TDLR claims — cite the page, don't carry the number across

**`lib/tdlr-sources.ts` lists every TDLR page this site treats as authoritative
and what each one actually settles.** Before stating a fee, a deadline, a CE
requirement or a rule number on a public page, fetch the source named there and
check it.

Do not copy a figure from a sibling page. The specialty licences differ from the
operator licences more than they look like they should, and "sourced from TDLR"
is worth nothing if the specific document behind the number isn't recorded.

Two things that file records because they cost real time to establish:

- **Whether specialty licence holders need continuing education is unresolved.**
  The at-a-glance PDF says "Barber and Cosmetology Operators licensees"; the CE
  page says "your license" with no qualifier. Three fetches did not settle it.
  Any page needing this must say it is unresolved and point at TDLR.
- **The late-renewal bands are rule-based** — 1.5× the fee at 90 days or less,
  2× beyond that up to 18 months. `/texas-barber-license-renewal` states them
  differently and is worth re-checking.

## SEO claims — check the docs, don't recall them

**Never assert how Google behaves from memory. Fetch the page that says it, and
cite it.** This applies to indexing, canonicalization, redirects, structured
data, robots/sitemaps, and every Search Console metric.

Assistants have a training cutoff; Google revises these docs continuously. The
failure is not refusing to look things up — it is answering confidently from a
half-remembered version and being subtly wrong in a way that reads as
authoritative. It has already happened here: an audit claimed a Search Console
"position 1" on a near-me query sits below the map pack. Plausible, widely
repeated, and not what the docs actually say.

### How to reach the docs

**`lib/google-search-docs.ts` maps all 153 pages in the Search Central
documentation navigation** — path and label, every one verified HTTP 200 on
2026-08-11. Use it to find the right page, then FETCH THAT PAGE. It is an index,
not a source: no claim about Google's behaviour may be sourced from it, because
it holds no claims.

This does not contradict the "don't vendor the docs" rule below. That rule is
about CONTENT, which goes stale silently. A path list carries nothing to go
stale — a moved page shows up as a 404 at the moment you fetch it, loudly.

The sitemap route is still dead, which is why the map was built by hand: the
index now returns 200 and advertises 40 children, and every child still returns
HTTP 500 with an empty body. Re-tested 2026-08-11.

Three steps:

1. **Look up the path** in `lib/google-search-docs.ts` (`findDocs("canonical")`,
   or the `SETTLES` map for the questions this repo keeps raising).
2. **Search the domain** if it isn't there — web search restricted to
   `developers.google.com`. Also the fallback when the map has drifted.
3. **Fetch that page** and read it before making the claim.

**Search Console REPORT documentation is on `support.google.com`, not
`developers.google.com`**, so it is outside that map — Page Indexing, the
Performance report and platform properties are Help articles on another host.

Do not vendor a copy of the docs into this repo. A snapshot goes stale, and a
stale local copy is worse than none — it gets trusted without a second look,
turning an occasional gap into a permanent wrong answer.

### Start here

- **<https://developers.google.com/search/updates>** — Google's changelog of doc
  changes. Read this first in any SEO audit; it is the only thing that closes
  the gap between a training cutoff and today.

### Pages that settle the recurring questions in this repo

Not a reading list — search reaches everything. These are the questions this
codebase keeps raising, each with the page that answers it.

| Question | Page |
|---|---|
| Entity slug changed; is a 301/308 enough, and what does a 404 cost? | `/search/docs/crawling-indexing/301-redirects` |
| Same business in two tables → two URLs. How do we consolidate? | `/search/docs/crawling-indexing/consolidate-duplicate-urls` |
| Which URL does Google pick when several are near-duplicates? | `/search/docs/crawling-indexing/canonicalization` |
| Traffic fell — ranking loss, or index churn? | `/search/docs/monitor-debug/debugging-search-traffic-drops` |
| What do clicks / impressions / position actually count? | `support.google.com/webmasters/answer/7042828` |
| Entity page markup for shops, salons, schools | `/search/docs/appearance/structured-data/local-business` |
| What belongs in the sitemap, and how big can it be? | `/search/docs/crawling-indexing/sitemaps/build-sitemap` |

Prefix the relative paths with `https://developers.google.com`. Verify a path
before citing it — pages move, and a broken citation is its own kind of drift.

## MCP registry claims — same rule, and the schema is date-versioned

**Never assert how the MCP registry, `server.json`, or the publishing flow works
from memory.** The protocol and the registry are both young and still moving;
anything recalled rather than read is likely to be a version behind.

This one has a sharper edge than the Google docs. The schema is pinned to a
dated URL:

    https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json

A `server.json` that validated last month can fail against a newer schema, and
the failure surfaces at publish time, not at write time. **Check the current
schema date before editing or publishing `server.json` — do not copy the date
above forward on trust.** It is recorded here to be checked, not reused.

Same standing rule as the SEO docs: do not vendor a copy of the MCP docs into
this repo. Fetch, read, then claim.

### How to reach the docs

1. **Docs live in the registry repo**, not on a docs site:
   `https://github.com/modelcontextprotocol/registry/tree/main/docs`
2. Fetch the **raw** file — the GitHub HTML view summarises and drops detail.
   Prefix with `https://raw.githubusercontent.com/modelcontextprotocol/registry/main/`.

### Pages that settle the recurring questions

Exact filenames — several plausible-looking paths 404, and the GitHub HTML view
summarises away detail, so fetch the raw file.

| Question | Page |
|---|---|
| How do I publish, end to end? | `docs/modelcontextprotocol-io/quickstart.mdx` |
| Every `server.json` field, incl. remote servers | `docs/reference/server-json/generic-server-json.md` |
| What the OFFICIAL registry enforces on top | `docs/reference/server-json/official-registry-requirements.md` |
| Every CLI command and login method | `docs/reference/cli/commands.md` |
| Schema version history (drift check) | `docs/reference/server-json/CHANGELOG.md` |
| Registry REST API (consuming, not publishing) | `docs/reference/api/generic-registry-api.md` |

### What was verified on 2026-08-02 — recheck, don't trust

- We are a **hosted web app, not an npm package**, so this is a `remotes` entry:
  `{"type": "streamable-http", "url": "https://…/mcp"}`. `sse` is the only other
  transport.
- Flow: `mcp-publisher init` → `login` → `validate` → `publish`. `validate`
  checks `server.json` without publishing and is worth running first.
- **Namespace is granted by the login method** — this is the decision that
  shapes everything else:

  | Login | Namespace granted |
  |---|---|
  | `login github` | `io.github.{user}/*`, `io.github.{org}/*` |
  | `login github-oidc` (CI) | same; needs `id-token: write` |
  | `login dns --domain=D --private-key=HEX` | `com.D.*` |
  | `login http --domain=D --private-key=HEX` | `com.D.*` |
  | `login none` | local testing only |

- For a branded namespace (`com.innergcomplete.*`) either DNS or HTTP works:
  - **DNS**: TXT at the domain root, `v=MCPv1; k=ed25519; p=PUBLIC_KEY`
  - **HTTP**: same string served at
    `https://<domain>/.well-known/mcp-registry-auth`
  - Keys: Ed25519 (64-char hex) or ECDSA P-384 (96-char hex).
  - **HTTP is the cheaper option here** — that well-known path is a route in
    this app, so it ships with a deploy and needs no DNS access.
- The official registry additionally: restricts package registry URLs to
  official sources, silently drops `_meta` keys other than
  `io.modelcontextprotocol.registry/publisher-provided`, and caps that metadata
  at 4KB.
- `mcpName` in `package.json` is documented for the **npm** path only. Not
  stated for remote-only servers — verify against the schema rather than
  assuming it is required or that it is not.

**Resolved since:** a remote-only document may omit `packages` entirely —
confirmed not just by the docs but by `mcp-publisher validate` accepting ours
against the live registry.

**`description` is capped at 100 characters** and the registry rejects a longer
one with a 422, not a warning. Nothing in the quickstart mentions the limit; it
surfaced only on validate. `title` has room (42 chars passed), so put the detail
there and keep `description` to one line. Always run `validate` before
`publish` — it caught this in one round trip.
Nothing requires `remotes[].url` to match the verified domain either; the docs'
own example verifies `example.com` and serves from `analytics.example.com`.

**Domain verification is APEX ONLY.** This is the finding that decides the
name: "The TXT record must be placed on the apex of your domain (e.g.
`example.com`), not under a selector." There is no documented way to verify a
subdomain. So hosting at `agency.innergcomplete.com` does not get us
`com.innergcomplete.agency` — we verify the apex `innergcomplete.com` and
publish under `com.innergcomplete/*`, with the endpoint URL free to stay on the
subdomain.

That also settles DNS vs HTTP here. HTTP verification would need the file at
`https://innergcomplete.com/.well-known/mcp-registry-auth` — the apex, a
different origin from the app, and one we do not serve. DNS needs only a TXT
record and no hosting at all.

## PSI claims — the exam vendor, and the bulletins are numbered not named

**TDLR does not write or administer the licensing exams. PSI does, under
contract.** So anything about exam content, question counts, time limits,
passing scores or the practical rubric is a PSI claim, not a TDLR one — and it
is settled by the Candidate Information Bulletin for that specific licence, not
by a TDLR page summarising it.

Same standing rule as everywhere else: fetch the bulletin, read it, then claim.
Do not carry a figure from one licence's CIB to another — the whole point of
`lib/texas-specialty-exams.ts` is that the specialty rubrics differ per licence
in ways the names do not suggest.

### How to reach the bulletins

`https://www.psiexams.com/licensure/barber-cosmetology/` is a marketing page and
settles nothing. The bulletins live behind **opaque numeric IDs**, which is the
detail worth writing down because nothing on the URL says which exam you are
fetching:

    https://test-takers.psiexams.com/api/content/bulletin/{id}

**Texas** — verified 2026-08-05:

| ID | Bulletin |
|---|---|
| 701 | Barber License Examination |
| 703 | Cosmetology Operator License Examination |
| 705 | Barber Technician License Examination |
| 707 | Barber Manicurist |
| 709 | Shampoo License |
| 711 | Hair Weaving License Examination |
| 713 | Manicurist License Examination |
| 715 | Esthetician License Examination |

**California** — verified 2026-08-09. Note the shape is completely different:

| ID | Bulletin |
|---|---|
| 916 | CA Barber Examination |
| 930 | CA Cosmetologist Examination |
| 940 | CA Electrology Examination |
| 941 | CA Esthetician Examination |
| 942 | CA Manicurist Examination |
| 11070 | CA Hairstylist Theory Examination |

**916, 930, 940, 941 and 942 are the same file, byte for byte** — one combined
26-page bulletin covering five licences. Only 11070 is a distinct document.
Texas issues eight separate bulletins; California issues two. Do not assume one
bulletin per licence, and do not assume an ID range: Texas sits at 701–715,
California at 916–942 with an outlier at 11070.

**Maryland** — verified 2026-08-10. PSI client code `mdcos`:

| ID | Bulletin |
|---|---|
| 4163 | MD Master Barber Theory |
| 4168 | MD Senior Cosmetologist Theory |
| 4175 | MD Barber |
| 4176 | MD Cosmetologist |
| 4179 | MD Esthetician |
| 4182 | MD Hairstylist |
| 4185 | MD Nail Technician |
| 5548 | MD Barber Stylist — **byte-identical to 4175** |
| 5549 | MD Blow Dry Stylist |
| 12375 | MD Eyelash Extension Technician |

Three states, three different shapes. Texas issues one bulletin per licence.
California issues one document for five licences and a second for the sixth.
Maryland issues nine for ten exams, with barber and barber-stylist sharing one.
There is no rule to infer here; check each state and dedupe on content.

**The account is named "Maryland Cosmetology" but carries the barber exams too.**
Maryland's own barbers exam page links no barber bulletin — only cosmetology
documents — so this portal is the only route to MD Barber, MD Barber Stylist and
MD Master Barber Theory. A state having two separate boards does not mean it has
two PSI accounts.

Verified means every ID returned a PDF and the title was read from page 1.
**Re-check the mapping before relying on an ID.** These are numbers on a
vendor's content API, not stable document names, and nothing guarantees 713
stays the manicurist bulletin.

### Finding the IDs for a new state

Nothing links these. The board site does not reference them, the portal's served
HTML contains no PDF links, and probing `/api/` paths is actively misleading —
every unknown path returns the JavaScript app's shell with **HTTP 200**, so a
wrong guess looks like a hit. Three hops, from the board's PSI client code
(`cabacos` for California):

    /api/account/{client}/test         -> tests, each with a globalTestId
    /api/account/{client}/test/{code}  -> mentions bulletin/{n}
    /api/content/bulletin/{n}          -> the PDF

`scripts/fetch_state_board_pdfs.js` does this automatically for any state whose
config sets `psiPortal`. Found originally only by opening a test page in a
browser and reading the rendered DOM.

To find an unknown state's client code, probe `/api/account/{code}`: a real code
returns `application/json`, a wrong one returns `application/problem+json`. Read
that carefully — both contain the word "json", and a naive check treats every
guess as a hit.

### Not every state has a practical exam — check before writing a kit list

**California's bulletin contains the word "practical" zero times** across 26
pages. No "hands-on", no "mannequin", no "model"; eleven mentions of "written
examination". California licenses on a written exam alone, so there is no kit to
bring and no kit list to write. Maryland is the opposite — 32 mentions of
"practical" per bulletin and a dedicated published kit list.

Kit lists are the highest-performing page type on this site by a wide margin, so
this is the first thing to establish about a new state, ahead of licensee
population. It is one word in one document and it decides whether the format
applies at all.

TDLR's own exam page — `/barbering-and-cosmetology/individuals/examinations/` —
is the right place for the process (eligibility, order of written before
practical, the 5-year eligibility window). Content questions go to the CIB.

## NACCAS claims — accreditation, and it stacks on top of the state

**NACCAS accredits most career beauty schools, and its requirements are separate
from and additional to TDLR's.** A school meets the stricter of the two on every
dimension. Treating a TDLR rule as the whole obligation is how the
distance-education work nearly went wrong.

### How to reach the docs

**The certificate chain on `naccas.org` does not validate.** `WebFetch` fails
outright ("unable to verify the first certificate") and `curl` needs `-k`. That
is not a reason to skip the source — it is a reason to know the workaround
before assuming the site is down.

- `https://naccas.org/naccas-handbook` — Standards & Policies, the governing set
- `https://naccas.org/resources-materials` — forms, guidelines, candidate-school material
- Individual policies live on the elibrary, not the main site:
  `http://elibrary.naccas.org/InfoRouter/docs/Public/NACCAS%20Handbook/Policies%20III.01-IX.02/Policy%20{ID}.pdf`
  That host is flaky — it refused a connection once mid-session and served fine a
  minute later. Retry before concluding it is gone.
- Several documents are on SharePoint links from `resources-materials`, which
  may expire. Prefer the handbook.

### The correction that earned this section

**Policy VI.02 does NOT contain a 50% distance-education cap.** Multiple
secondary sources say it does, a web search summary said it did, and that claim
was repeated into a draft here before the policy was read. VI.02 has five
elements and no percentage; the complete policy set III.01–IX.02 contains "50%"
exactly once, in a refund table. The 50% figures are set by Texas and Alabama
independently.

What VI.02 actually requires — all five, quoted in
`lib/distance-education-states.ts`: measurable instructor-validated
participation, all GPA-bearing assessment physically on campus, the student on
campus at least once every 10 business days, distance hours identified on every
transcript, and a signed dated reciprocity disclaimer in each student file.

**The lesson is the general one: a summary of a policy is not the policy.** If a
claim about NACCAS cannot be traced to a numbered policy or standard, it is not
citable.

## AI crawler claims — read the operator's doc, and know the two traps

**Never add, remove or edit a user-agent token in `app/robots.ts` /
`lib/robots-rules.ts` from memory or from a robots.txt someone posted online.**
Fetch the operator's own documentation, then edit.

This one has a nastier failure mode than the others in this file, because
nothing ever tells you that you got it wrong. A misspelled, retired or invented
user-agent token does not error. It produces a group that never matches any
request, so the rule is inert — and the served `robots.txt` looks correct,
every validator passes it, and the intent reads fine to a human.

### The two traps, both of which this repo hit

**1. Named groups do NOT inherit the `*` group.** Google states it directly:
*"User agent specific groups and global groups (`*`) are not combined."* A
crawler picks the single most specific group that matches and ignores every
other one. So this:

    User-agent: GPTBot
    Allow: /*.md$

does not mean "GPTBot may also read .md". It means GPTBot's entire rule set is
that one line and everything else is permitted. Seven named AI crawlers were
being handed `/admin/`, `/dashboard/`, `/login/`, `/select-portal/`, `/api/`
and `/auth/` for exactly this reason. **Every group must repeat the private
disallows** — `lib/robots-rules.ts` builds them from one shared array so they
cannot drift, and `lib/robots-rules.test.ts` asserts no group can carry an
allow with no disallow.

**2. `GoogleOther-Extended` does not exist.** It is in widely-copied robots.txt
snippets all over the web and in none of Google's documentation, which lists
`GoogleOther`, `GoogleOther-Image`, `GoogleOther-Video` and `Google-Extended`
and nothing combining them. Treat every pasted list as a set of claims to check.

### Asymmetry worth internalising

An unverified **Allow** is harmless — if the token matches nothing, the line
does nothing. An unverified **Disallow** is dangerous, because you believe
something is protected and it isn't. That is why `lib/robots-rules.ts` keeps
`AI_CRAWLERS` (read from operator docs, with URLs) separate from
`AI_CRAWLERS_UNVERIFIED` (allowed anyway, because permission costs nothing)
rather than refusing the second group.

### Operator documentation — verified 2026-08-10

Every URL below returned the tokens listed. **Re-check before relying on one**;
these lists change and several already have.

| Operator | Documentation | Tokens |
|---|---|---|
| OpenAI | `https://developers.openai.com/api/docs/bots` | `GPTBot` (training), `OAI-SearchBot` (ChatGPT search), `ChatGPT-User` (user-triggered fetch), `OAI-AdsBot` (ad validation — not a discovery surface) |
| Anthropic | `https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler` | `ClaudeBot` (training), `Claude-User` (user-triggered), `Claude-SearchBot` (search quality) |
| Google — common crawlers | `https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers` | `Googlebot`, `Googlebot-Image/-Video/-News`, `GoogleOther`, `GoogleOther-Image/-Video`, `Storebot-Google`, `Google-InspectionTool`, `Google-CloudVertexBot`, `Google-Extended` |
| Google — special-case | `https://developers.google.com/crawling/docs/crawlers-fetchers/google-special-case-crawlers` | `APIs-Google`, `AdsBot-Google`, `AdsBot-Google-Mobile`, `Mediapartners-Google`, `Google-Safety` |
| Google — changelog | `https://developers.google.com/crawling/docs/changelog` | **read this first.** `Google-Agent` was added here on 2026-03-20 and is on neither reference page above. |
| Google — robots spec | `https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt` | group precedence, and trap 1 |
| Perplexity | `https://docs.perplexity.ai/guides/bots` | `PerplexityBot` (search index), `Perplexity-User` (user-triggered). Neither trains models. |
| Apple | `https://support.apple.com/en-us/119829` | `Applebot` (crawls; feeds search AND Apple Intelligence), `Applebot-Extended` (**does not crawl** — a training-permission signal only) |
| Meta | `https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/` | `Meta-WebIndexer`, `Meta-ExternalAgent`, `Meta-ExternalFetcher`, `Meta-ExternalAds`, `facebookexternalhit`. Meta's own docs warn `Meta-ExternalFetcher` and `facebookexternalhit` may bypass robots.txt. |
| Amazon | `https://developer.amazon.com/amazonbot` | `Amazonbot`, `Amzn-SearchBot`, `Amzn-User` |
| DuckDuckGo | `https://duckduckgo.com/duckduckgo-help-pages/results/duckassistbot` | `DuckAssistBot` (AI answers; distinct from `DuckDuckBot`, ordinary search) |
| Common Crawl | `https://commoncrawl.org/ccbot` | `CCBot` — not an answer engine, but the corpus a large share of open models train on |
| Allen Institute | `https://allenai.org/crawler` | `AI2Bot` |

**Searched and found nothing publishable:** ByteDance/`Bytespider` (no doc, and
independently reported to crawl paths it was disallowed — so it is a permission
statement here, not a control), Cohere/`cohere-ai`, You.com/`YouBot`,
Mistral/`MistralAI-User`, xAI/Grok. Diffbot documents customer-configurable user
agents, so it has no canonical token.

**Microsoft has no separate AI token.** Copilot uses `bingbot`. Its docs note
bingbot still honours directives written for the retired `msnbot`.

### Why the `.md` layer is no longer gated by robots.txt

It used to be: `Disallow: /*.md$` for `*`, with named AI crawlers allowed past
it, to stop the Markdown twins being indexed as duplicates of the HTML pages.
That made a hand-maintained list the gate on the entire `.md` layer — every AI
crawler launched after the last edit was silently refused.

Google rules out both obvious fixes:

- *"Don't use the robots.txt file for canonicalization purposes. Google may
  still index URLs that are disallowed in robots.txt without their content."*
- *"We don't recommend using noindex to prevent selection of a canonical page
  within a single site… `rel="canonical"` link annotations are the preferred
  solution."*
  — `/search/docs/crawling-indexing/consolidate-duplicate-urls`

So `middleware.ts` sets a `Link: <...>; rel="canonical"` header on every `.md`
response, pointing at the HTML page. It is explicitly supported for non-HTML
documents, and unlike `noindex` it carries no "do not use this content" signal
an AI crawler might read as a refusal. **`middleware.ts` is the single choke
point for `.md`** — that is the only reason dropping the robots.txt rule is
safe, so if `.md` ever gets served from somewhere else, the header goes there
too.

## Search Console platform properties — social data, and it postdates your cutoff

**Search Console now has PLATFORM PROPERTIES: Instagram, TikTok, X and YouTube
accounts added as first-class properties, reporting how that content performs
in Google Search.** This project has them connected.

### Why this needs writing down

The feature was announced December 2025 and rolled out globally with its own
guide in July 2026. **That is after the assistant knowledge cutoff.** An
assistant asked about it will not know it exists, and the failure mode is not
"I'm not sure" — it is confidently explaining that Search Console has no social
integration and that the user must mean Google Business Profile. That answer is
wrong and sounds authoritative, which is the exact pattern the SEO section of
this file exists to prevent. Look it up; do not reason from memory.

- <https://developers.google.com/search/docs/monitor-debug/analyze-social-video-content>
- <https://support.google.com/webmasters/answer/17148418> — about platform properties
- <https://developers.google.com/search/blog/2026/07/platform-properties-social-video-guide>

### What it is, as of 2026-08-11

- **Four platforms only**: Instagram, TikTok, X, YouTube.
- **Added like any other property** — property selector, Add, authenticate,
  verify ownership. Data appears within a few days. Google periodically
  re-verifies; if credentials lapse, reconnecting restores access without
  losing collected data.
- **Performance report**: clicks, impressions, CTR and position, filterable
  across Google Search, Discover and News. Plus an Insights report and
  "Achievements". Default range 28 days.

### The limitation that decides how to read it

**It only shows how the content performs ON GOOGLE SEARCH.** It is not
analytics for the platform itself — TikTok views on TikTok are not in here.
Anyone treating these numbers as social engagement is misreading them by an
order of magnitude.

### THE API DOES NOT EXPOSE THEM — verified, don't waste time

`webmasters.sites.list` returns only the five web properties on this account.
Platform properties do not appear, so the Search Console API cannot query them
and an assistant cannot analyse this data. It is UI-only for now. Checked
2026-08-11 with `scripts/gsc_list_sites.js`; re-test before assuming it is
still true, because this feature is moving quickly.

### Do not conflate this with `sameAs` schema

Two different mechanisms, both worth having, neither substituting for the
other:

| | What it is | Where it lives |
|---|---|---|
| Platform property | Reporting. Shows how social content does in Google Search. | Search Console UI |
| `sameAs` on Organization | An identity assertion linking the org to its profiles. | `lib/schema-graph.ts` |

Adding a platform property does not put anything in the structured data, and
adding `sameAs` does not produce any report. The Organization node currently
carries a single `sameAs` (the LinkedIn company page) and is emitted site-wide
from the root layout, so extending it is a one-line change.

**Related and unresolved:** whether the social profiles' own bios still link to
`agency.innergcomplete.com`. If they do, they are anchoring the brand to the
domain being migrated away from — a contradictory signal that no amount of
schema fixes.

## Domain migration — the Change of Address IS filed. Don't re-diagnose it.

**`agency.innergcomplete.com` → `shearquery.com`. The Change of Address has
been submitted. The lag is expected. Do not conclude from bad Search Console
numbers that nobody filed it.**

This needs writing down because the evidence looks alarming on every fresh
look, and re-deriving it costs an hour each time. As of 2026-08-11:

| Property | 28-day impressions |
|---|---|
| `agency.innergcomplete.com` | ~362,000 |
| `sc-domain:shearquery.com` | ~1,200 |

And URL Inspection on the highest-traffic entity pages returns, for their
shearquery.com twins, **"URL is unknown to Google — never crawled."** Roughly
8,200 entity pages carrying 96% of impressions are simply not crawled on the
destination domain yet.

That is what an in-progress migration of this size looks like. The redirects
are correct (308, path-preserving, verified). Google forwards signals for 180
days from filing. It takes as long as it takes.

### What to check instead of re-litigating whether it was filed

URL Inspection is the instrument, and the sequence is legible:

    URL is unknown to Google  ->  Discovered - currently not indexed
                              ->  Crawled - currently not indexed
                              ->  Submitted and indexed

Re-inspect a known-stranded page — `/shop/aliana-barbershop-sugar-land-77e23edc`
was "unknown to Google" on 2026-08-11 — and watch it move. Movement means it is
working. No movement over several weeks is the only thing that warrants
reopening the question.

### Two things that are NOT symptoms of the migration

- **New content indexes fine.** `/california-exam-changes-2026` and
  `/california-cosmetology-license` were both PASS/indexed within a day of
  publishing. Publishing is not blocked; don't wait on the migration to ship.
- **Pages that earn nothing while indexed are a CONTENT problem, not a
  crawl problem.** `/texas-school-leaderboard` and `/compare-schools` are
  indexed on shearquery.com and earned zero impressions on the OLD domain too,
  where everything else ranks. That is demand and naming — see the section
  below on regulator vocabulary.

### One page really is canonical-stuck, and only one

`/texas-barber-practical-exam-kit-list` inspects as "Duplicate, Google chose
different canonical than user", with Google preferring the old domain. It is
the site's best-performing content page, and the equity that makes it good is
what anchors the canonical. 0 of the 12 highest-impression pages showed this,
so it is an exception rather than the pattern — do not generalise it.

## IndexNow — one URL at a time. Never bulk-submit.

**Submit URLs to IndexNow one at a time, as they change. Do not batch-submit,
and do not run `scripts/indexnow_bulk_submit.js`.** Bulk submission has caused
problems for this site and is no longer how we notify search engines.

### Where the rule comes from, and what it is NOT

This one deserves care, because the obvious citation does not support it. The
IndexNow protocol explicitly permits bulk: "You can submit up to 10,000 URLs
per post." So **do not justify this rule from the spec** — anyone who checks
will find the spec allows exactly what we are refusing to do, and the rule will
get overturned by someone reading the docs and concluding we were confused.

The rule rests on two things instead:

1. **Operational experience with this site**, reported by the site owner.
2. **A finding already recorded in `lib/indexnow.ts`**, which is the part that
   explains the mechanism: *Bing classifies a site's submission mode by the
   SHAPE of the request, not by how many URLs it carries.* Posting a `urlList`
   of ONE was enough to make every ordinary publish look like a batch
   submission and got the site flagged as batch mode in Webmaster Tools, even
   though pings were already going out one page at a time.

What the published guidance does support is the direction of travel: the
recommended approach is to "automate submission of URLs as soon as the content
is added, updated, or deleted", and a 429 exists for submitting too much. That
is an argument for streaming, not an argument against batching. The argument
against batching is ours.

### What to do instead

`lib/indexnow.ts` already implements this correctly and is the only path that
should be used:

- `pingIndexNow(["/some-route"])` with a **single** URL sends a GET with query
  parameters — `mode: "streaming"`.
- Two or more URLs fall through to the POST `urlList` — `mode: "batch"`.
  **Call it once per URL rather than passing an array.**

`buildIndexNowRequest` is separated from the network call precisely so the
request shape can be asserted in tests; `lib/indexnow.test.ts` covers it. If
you change how pings are sent, that test is the thing that must still pass.

For a large set of new pages, ping them individually and spread them out.
There is no approved fast path for backfilling hundreds of URLs — if that need
arises, raise it rather than reaching for the bulk script.

### `scripts/indexnow_bulk_submit.js` is retired

It is kept for reference, not for running, and it now refuses to execute. Two
reasons beyond the rule above:

- Every run is a batch submission by construction, which is the behaviour we
  are trying to stop.
- **Its `HOST` was never updated for the domain migration** — it still said
  `agency.innergcomplete.com` after the site moved to `shearquery.com`. A run
  would have submitted URLs on a host we no longer publish, against a key file
  served somewhere else. That is a good illustration of why a script nobody
  runs is a liability: it rots silently and then someone trusts it.

Do not "fix" the host and run it. Do not copy its POST logic into a new script.
