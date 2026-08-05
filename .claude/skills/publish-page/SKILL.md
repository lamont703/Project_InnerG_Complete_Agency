---
name: publish-page
description: Checklist for adding or changing a public page in this app — metadata, canonical, sitemap and .md eligibility, JSON-LD, and the verification that catches what review misses. Use whenever creating a page under app/, changing a page's metadata or description, or changing whether a route is public.
---

# Publishing a page

Every item here exists because it was missed once. The point is not to
describe good SEO — it is to close the specific gaps this codebase has
actually shipped.

Read `CLAUDE.md` first for the branch policy and the two sourcing rules
(TDLR figures, Google behaviour). This file covers the mechanics it doesn't.

---

## 1. Metadata — and the `"use client"` trap

**A client component cannot export `metadata`. Omitting it is silent.** No
build error, no warning. The page just serves `<meta name="robots"
content="index, follow">` and whatever title the root layout supplies.

Six pages shipped that way — `/account/add-business`, `/account/add-professional`,
`/account/manage-listing`, `/accept-invite`, `/forgot-password`,
`/reset-password` — all six advertising an account shell or a password form
as indexable. Every server-component sibling was fine. That is the whole
pattern: the trap is the rendering mode, not the author.

So, before anything else:

```bash
head -1 app/<route>/page.tsx     # is it "use client"?
```

- **Server component** → `export const metadata` in `page.tsx`.
- **Client component** → put it in a sibling `layout.tsx` that returns
  `children`. See `app/california-school-leaderboard/layout.tsx` for the
  established shape, or `app/account/layout.tsx` for the noindex case.

Next.js merges metadata field by field from layout down to page, so a layout
can supply `robots` while each page keeps its own `title`.

Prefer putting it on a **subtree layout** when a whole directory shares a
rule. `app/account/layout.tsx` covers every current and future account page;
patching fifteen individual files would not have.

## 2. Public or not — one decision, two surfaces

`lib/public-routes.ts` decides both what enters the sitemap and what may be
served as `.md`. Its header says the two "must never diverge."

They did. `/account`, `/accept-invite`, `/forgot-password` and
`/reset-password` were listed in `MARKDOWN_EXTRA_EXCLUDE_PREFIXES` — refused
to crawlers as prose — while the sitemap advertised all 18 of them.

**Put an exclusion in `SITEMAP_EXCLUDE_PREFIXES`.** `isMarkdownEligible()`
consults that array first, so one entry covers both surfaces and they cannot
drift. `MARKDOWN_EXTRA_EXCLUDE_PREFIXES` is only for the narrower case: a
route that genuinely belongs in the sitemap but whose rendered output is not
readable prose.

Prefix matching is `route === p || route.startsWith(p + '/')`, so `/account`
does **not** swallow `/accountability`. Add a case to the check in §6 if a new
prefix could collide.

## 3. Description

Public pages need one, 110–160 characters. Bing flags short ones, and that
warning is what surfaced the thin `/account` pages in the first place.

For anything built from a record, use `lib/seo-description.ts` —
`composeDescription` plus `ratingClause`, `streetClause`, `servicesClause`,
`percentClause`, `priceClause`, `cleanPlace`.

**It drops whole clauses rather than clipping characters.** That is the
point of it: character-clipping produced tails like `TRIM, LINE-UP &.` Do
not reintroduce a `.slice(0, 160)`.

## 4. Canonical

`alternates: { canonical: "https://agency.innergcomplete.com/<route>" }` on
every public page. The pages currently without one are all private or
noindex, which is correct — keep it that way.

## 5. JSON-LD

100 pages emit it. Follow the existing shape — a `<script
type="application/ld+json">` with `dangerouslySetInnerHTML` and
`JSON.stringify` — see `app/texas-school-penalties-distance-education/page.tsx`.

`FAQPage`, `Article`, `HowTo`, `BreadcrumbList` and `ItemList` are the types
in use. Author blocks come from `authorSchema()` in `lib/author.ts` — don't
hand-roll one.

Every fact in the markup must appear in the visible page. Markup that
asserts something the page doesn't show is the failure mode structured-data
guidelines exist to prevent.

## 6. The `.md` twin is automatic — but verify it

Any markdown-eligible route answers to `.md` already. Middleware rewrites it
(`middleware.ts`), and `lib/page-markdown.ts` renders the page and strips
chrome, so there is no second copy to write and nothing to rot.

Two things that are **not** true and shouldn't be assumed:

- `"use client"` does *not* produce a hollow twin. Next.js server-renders
  client components for the initial HTML, so the prose is there. Verified:
  `/barber-booth-rent-houston.md`, `/kids-haircuts-houston.md` and
  `/careers.md` all return 2–7KB of real content.
- Entity profiles and the comparison hubs do **not** use this renderer. They
  have purpose-built Markdown from their source records
  (`app/api/llm/[entityType]/[slug]`, `app/api/llm-page/[...slug]`) which
  takes precedence and is richer.

## 7. Verify by rendering, not by reading

This is the step that catches everything above. Every bug in this file
survived code review and died the moment someone fetched the page.

```bash
npx next dev -p 3399 &
# then, per route:
curl -s localhost:3399/<route> | grep -io '<meta name="robots"[^>]*>'
curl -s localhost:3399/<route> | grep -io '<title>[^<]*</title>'
curl -s localhost:3399/<route> | grep -o 'rel="canonical"[^>]*'
curl -s localhost:3399/<route>.md | head -20
```

If you changed `lib/public-routes.ts`, diff the whole sitemap rather than
trusting the unit logic — and **normalise the host first**, because the local
sitemap uses the dev host and a raw diff will otherwise show every URL as
changed:

```bash
curl -s localhost:3399/sitemap.xml | grep -o '<loc>[^<]*</loc>' \
  | sed 's/<[^>]*>//g; s|https\?://[^/]*||' | sort -u > /tmp/new.txt
curl -s https://agency.innergcomplete.com/sitemap.xml | grep -o '<loc>[^<]*</loc>' \
  | sed 's/<[^>]*>//g; s|https\?://[^/]*||' | sort -u > /tmp/old.txt
comm -23 /tmp/old.txt /tmp/new.txt    # removed — must be exactly what you intended
comm -13 /tmp/old.txt /tmp/new.txt    # added
```

Then `npm run build`. A metadata mistake will not fail the build, which is
precisely why the render check comes first.

## 8. Claims on the page

Both rules are in `CLAUDE.md` and both are absolute:

- **TDLR figures** — fetch the source named in `lib/tdlr-sources.ts` and
  check it. Never copy a fee, deadline or CE requirement from a sibling
  page; the specialty licences differ from the operator licences more than
  they look like they should.
- **Google behaviour** — never assert it from memory. Search
  `developers.google.com`, fetch the page, cite it. Applies to indexing,
  canonicalisation, redirects, structured data and robots.

Two settled points worth not re-deriving:

- Conflicting robots rules resolve to **the more restrictive**, and
  `X-Robots-Tag` is equivalent to the meta tag.
- A `noindex` "can be read and followed only if crawlers are allowed to
  access" the page. So `noindex` and a `robots.txt` disallow are
  alternatives, not partners — blocking a page leaves its `noindex` unread
  and the URL still eligible to surface.

## Quick checklist

- [ ] `"use client"`? → metadata goes in a sibling/subtree `layout.tsx`
- [ ] title + description (110–160 chars, clause-dropping not clipping)
- [ ] canonical via `alternates`
- [ ] public/private set in `SITEMAP_EXCLUDE_PREFIXES`, not only the markdown list
- [ ] JSON-LD matching what the page actually shows
- [ ] rendered and checked: robots, title, canonical, `.md`
- [ ] sitemap diffed if `lib/public-routes.ts` changed
- [ ] TDLR and Google claims fetched from source
- [ ] `npm run build` passes
- [ ] on `barber-intel-diagnostic-v2`, push verified against the remote
