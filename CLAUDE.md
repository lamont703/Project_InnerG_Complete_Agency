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

There is no URL list to maintain, and don't try to build one — the
`developers.google.com` sitemap index advertises 40 child sitemaps and every one
returns HTTP 500. Two steps instead:

1. **Search the domain**: web search restricted to `developers.google.com`.
   Finds the right page without anyone knowing the URL in advance.
2. **Fetch that page** and read it before making the claim.

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
