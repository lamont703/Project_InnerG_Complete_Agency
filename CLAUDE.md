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
