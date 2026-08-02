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
