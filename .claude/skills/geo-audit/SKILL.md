---
name: geo-audit
description: Audit the surfaces AI assistants and agents actually consume — the .md twin layer, llms.txt, the AI-crawler robots.txt groups, and the MCP server. Use when changing public routes, lib/public-routes.ts, robots.txt, the Markdown renderers, or before claiming the site is AI-visible.
---

# Auditing the AI surface

This site serves machines through four things classic SEO does not touch:

| Surface | Where it lives |
|---|---|
| `.md` twin of every public page | `middleware.ts` rewrite → `app/api/llm/[entityType]/[slug]` (entities) and `app/api/llm-page/[...slug]` (everything else, via `lib/page-markdown.ts`) |
| `public/llms.txt` | the index that tells crawlers the `.md` convention exists |
| AI-crawler groups in `public/robots.txt` | GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended |
| MCP server at `/mcp` | `app/mcp/route.ts`, published as `com.innergcomplete/shearquery` |

Nothing verifies any of it automatically. Everything below is a check, not a
theory.

Use `verify-live` for the environment rules — in particular, **staging is
SSO-protected and production only moves on a manual PR**.

---

## 1. Does every public page have a working `.md` twin?

The twin is automatic, so the failure mode is silent: a route that becomes
markdown-ineligible loses its twin with no error anywhere.

```bash
curl -s https://agency.innergcomplete.com/sitemap.xml | grep -o '<loc>[^<]*</loc>' \
  | sed 's/<[^>]*>//g' | sort -R | head -25 | while read u; do
  b=$(curl -s --max-time 30 "$u.md" | wc -c | tr -d ' ')
  s=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$u.md")
  [ "$s" = "200" ] && [ "$b" -gt 800 ] || echo "  THIN/MISSING ($s, ${b}b): $u.md"
done
```

Healthy baseline: entity twins 2–7KB, hub pages more. Under ~800 bytes means
the renderer got an empty shell.

Two things that are **not** true and should not be assumed:

- `"use client"` does **not** produce a hollow twin. Next.js server-renders
  client components for the initial HTML. Verified against
  `/barber-booth-rent-houston.md`, `/kids-haircuts-houston.md` and
  `/careers.md` — all real prose.
- Entity profiles and the comparison hubs do **not** use the generic
  renderer. They build Markdown from source records and take precedence.

## 2. Does the `.md` disagree with the page?

`llms.txt` promises crawlers that the Markdown and the HTML never disagree.
That promise is only as good as the shared builders — anything hand-written
into one and not the other breaks it silently.

Spot-check a figure that appears in both, especially after touching
`lib/compare-content.ts` or a page that renders live data:

```bash
curl -s https://agency.innergcomplete.com/compare-shops.md | head -40
```

Numbers there must come from the same builder the HTML page uses. If someone
has hardcoded a figure into either side, that is the bug.

## 3. The robots.txt trap — groups are not combined

Google's docs are explicit: *"User agent specific groups and global groups
(`*`) are not combined."* A crawler obeys **only** its most specific matching
group.

Our AI-bot group contains a single `Allow: /*.md$` and **no `Disallow`
lines**. So GPTBot, ClaudeBot, PerplexityBot and the rest are **not** subject
to the `Disallow: /api/`, `/admin/`, `/dashboard/`, `/auth/` rules in the
`*` group. They may crawl everything.

That is currently tolerated, not accidental — but re-check it whenever
`robots.txt` changes, and never assume a `Disallow` in the `*` block protects
anything from an AI crawler.

```bash
curl -s https://agency.innergcomplete.com/robots.txt
```

Also confirm the `*` group still carries `Disallow: /*.md$` — the twins are
deliberately withheld from general search engines and offered only to AI
crawlers. Losing that turns every page into a duplicate-content pair.

## 4. Is anything private leaking into the machine surfaces?

`lib/public-routes.ts` gates both the sitemap and the `.md` layer, and its
two lists have drifted apart twice. Put exclusions in
`SITEMAP_EXCLUDE_PREFIXES` — `isMarkdownEligible()` consults it first, so one
entry covers both.

```bash
for p in /account/add-business /accept-invite /admin/ad-campaigns /dashboard; do
  printf "  %-26s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://agency.innergcomplete.com$p.md)"
done
```

Anything private must **not** return 200. It should fall through and 404 —
deliberately, so the response does not reveal which private paths exist.

## 5. Is the MCP server answering?

```bash
curl -s -X POST https://agency.innergcomplete.com/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | python3 -m json.tool | head -20
```

Should list `compare_barber_cosmetology_schools`, `compare_barbershops_salons`
and `texas_licensee_counts`. `GET /mcp` correctly returns **405** with a
human-readable body — that is the endpoint working, not an error.

Hardening already in place, worth not regressing: echoed arguments are capped
at 80 chars with newlines stripped (`safeEcho` in `lib/mcp/tools.ts`), bodies
over 32KB are refused, and there is a per-instance rate limit that is
explicitly partial on serverless.

## 6. llms.txt still accurate?

`public/llms.txt` is hand-maintained and describes what the site covers and
which sources back it. It rots when tools are added or removed — check the
tools and hubs it names still exist, and that new ones are listed.

## What actually matters here

Two findings worth keeping in view:

- The `.md` twins measured **p50 0.28s / p95 1.54s** under a 10-concurrent
  burst versus **1.10s / 3.56s** for the HTML. ChatGPT fetches pages in real
  time during query fan-out rather than from an index, so the twins are the
  fast path that keeps us in the answer. Regressing their speed matters more
  than regressing the HTML's.
- Claude uses `llms.txt` heavily and reaches the web via Brave, so Brave
  visibility is a separate surface from Google and Bing. Do not assume one
  covers the others.
