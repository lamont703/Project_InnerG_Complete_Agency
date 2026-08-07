---
name: verify-live
description: Check what a URL actually serves, in the right environment, without being misled. Use after pushing a change, before claiming something is fixed or broken, or when auditing pages, headers, redirects, robots tags or the sitemap.
---

# Verifying what is actually served

Every bug found in this repo recently survived code review and died the
moment someone fetched the page. Reading the source tells you what should
happen. This tells you what does.

The catch is that the check itself lies in at least five ways, all of which
have already produced a confident wrong answer here. Each one below is a
mistake that was actually made, not a hypothetical.

---

## 1. First: which environment are you looking at?

| Host | Reflects | Updated by |
|---|---|---|
| `localhost:<port>` | your working tree | `next dev` |
| `staging.innergcomplete.com` | `barber-intel-diagnostic-v2` | pushing to the branch |
| `shearquery.com` | `main` — **production** | a **manual PR**, merged by a human |
| `agency.innergcomplete.com` | nothing — **308s to shearquery.com** | — |

**The production domain moved.** `agency.innergcomplete.com` now 308-redirects
every path to `shearquery.com`, and `SITE_URL` in `lib/site.ts` is the one
place that origin is written down. Checking the old host without `-L` returns
a 15-byte "Redirecting..." body, whose `<title>` and canonical greps both come
back empty — which reads exactly like a page with no metadata. Use `-L`, or
check `shearquery.com` directly.

**Pushing does not change production.** A fix committed and pushed reaches
staging only. Checking `shearquery.com` afterwards shows the old
behaviour, which reads exactly like the fix failing — and the natural
response, "re-apply it harder", makes things worse.

So:

- **Diagnosing what is wrong in the wild** → `shearquery.com`.
  That is what real users and Googlebot get.
- **Confirming your fix works** → `localhost` or `staging`, never production
  until the PR is merged.

Both are legitimate; picking the wrong one is what breaks.

## 2. Staging is behind Vercel Deployment Protection

Plain `curl` gets a **302 to `vercel.com/sso-api`** and a 15-byte body — no
title, no robots tag, no content. That looks identical to "the page is
broken" and is not.

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://staging.innergcomplete.com/
# 302 -> https://vercel.com/sso-api?url=...
```

The way through is **Protection Bypass for Automation**. The secret is in
`.env.local` as `VERCEL_AUTOMATION_BYPASS_SECRET` (generated in Project
Settings → Deployment Protection). Both documented methods work here,
confirmed against staging:

```bash
S=$(grep '^VERCEL_AUTOMATION_BYPASS_SECRET=' .env.local | cut -d= -f2- | tr -d '"'"'"' \r\n')

# header — preferred
curl -s -H "x-vercel-protection-bypass: $S" https://staging.innergcomplete.com/some-page
# query parameter — for anything that cannot set headers
curl -s "https://staging.innergcomplete.com/some-page?x-vercel-protection-bypass=$S"
```

**Extract the secret with `grep`/`cut`, not `source .env.local`.** Sourcing
that file fails partway through and leaves the variable **empty**, so the
request goes out with a blank header, comes back 302, and looks exactly like
a bad secret. Always confirm you actually loaded something:

```bash
[ ${#S} -eq 32 ] || echo "secret not loaded — length ${#S}"
```

A convenience wrapper worth defining when auditing several pages:

```bash
stg() { curl -s -H "x-vercel-protection-bypass: $S" --max-time 45 "https://staging.innergcomplete.com$1"; }
```

Note that staging serves **production canonicals** (`alternates.canonical` is
absolute), so staging pages cannot compete in the index. That is intended —
do not "fix" it.

## 3. `curl` prints a redirect's body, so a 307 can look like a 200

`/tools/ai-booth-station` is a bare `redirect()`. It answers **307** — and
Next.js sends a full HTML body with it. Grepping that body for a robots tag
returns `index, follow` and looks exactly like a normal indexable page. It
isn't; Google follows the redirect and the body's tag is not the operative
signal.

Always establish the status before interpreting the body:

```bash
curl -s --no-location -D - -o /dev/null https://shearquery.com/some-page | head -3
curl -sL -o /dev/null -w "final: %{url_effective} (%{num_redirects} hops, %{http_code})\n" https://shearquery.com/some-page
```

If it redirects, `noindex` markup is the wrong tool — fix it in the sitemap
or at the redirect target.

## 4. The sitemap will serve you a stale answer

`app/sitemap.ts` calls `isExcludedFromSitemap` **inside `unstable_cache`**,
so editing `lib/public-routes.ts` does not invalidate it. And several dev
servers share one `.next`, so clearing the cache under a running server just
lets another repopulate it. This produced *two consecutive* diffs showing
zero removals before the cache — rather than the code — came under suspicion.

```bash
pkill -9 -f "next dev"; rm -rf .next
npx next dev -p 3399 &
```

**A fast sitemap response is a stale one.** Real generation is a filesystem
walk plus nine full-table Supabase scans — roughly **8–15 seconds**. Under a
second means you are reading a cache.

## 5. `sed` on macOS is BSD sed

`\?` is not supported in a basic regex, and it fails *silently* — the host
survives and every URL reads as changed. Use `sed -E`.

```bash
norm() { grep -o '<loc>[^<]*</loc>' | sed 's/<[^>]*>//g' | sed -E 's|https?://[^/]+||' | sort -u; }
curl -s -m 900 localhost:3399/sitemap.xml | norm > /tmp/new.txt
curl -s https://shearquery.com/sitemap.xml | norm > /tmp/old.txt
comm -23 /tmp/old.txt /tmp/new.txt   # removed — must be exactly what you intended
comm -13 /tmp/old.txt /tmp/new.txt   # added
```

An empty "removed" list when you expected removals means §4, not a working
exclusion.

---

## The checks themselves

```bash
P=https://shearquery.com/some-page     # or localhost:3399/some-page
curl -s "$P" | grep -io '<title>[^<]*</title>'
curl -s "$P" | grep -io '<meta name="description" content="[^"]*"'
curl -s "$P" | grep -io '<meta name="robots"[^>]*>'
curl -s "$P" | grep -o 'rel="canonical" href="[^"]*"'
curl -s "$P" | grep -c 'application/ld+json'
curl -s -o /dev/null -w 'ttfb=%{time_starttransfer}s status=%{http_code}\n' "$P"
```

**A canonical pointing at `/` is a bug, not a default.** `app/layout.tsx`
sets `alternates: { canonical: '/' }`, and Next.js merges metadata — so any
page that does not set its own inherits it and declares itself a duplicate of
the homepage. That is worse than a duplicate title: it asks Google not to
index the page at all. `/barber-beauty-network` did this and drew 865 pixel
events in 90 days with **zero** from search.

## Auditing many pages

Loop over the sitemap rather than spot-checking, and let the data pick the
priorities:

```bash
curl -s https://shearquery.com/sitemap.xml | grep -o '<loc>[^<]*</loc>' \
  | sed 's/<[^>]*>//g' | sort -R | head -30 | while read u; do
  h=$(curl -s --max-time 30 "$u")
  printf "%-64s %s | %s\n" "${u#https://shearquery.com}" \
    "$(echo "$h" | grep -io 'content="\(noindex[^"]*\|index, follow\)"' | head -1)" \
    "$(echo "$h" | grep -io '<title>[^<]*</title>' | head -1 | sed 's/<[^>]*>//g' | cut -c1-40)"
done
```

Repeated identical titles are the signal — that is how the homepage-metadata
inheritance surfaced.

## Load behaviour

Single requests hide cold starts. For crawler-like behaviour use `xargs -P`:

```bash
cat urls.txt | xargs -P 10 -I{} curl -s -o /dev/null -w '%{time_starttransfer} %{http_code} {}\n' --max-time 45 {}
```

Baseline measured on production: entity pages p50 1.10s / p95 3.56s, `.md`
twins p50 0.28s / p95 1.54s, no errors. Materially worse than that is a
regression worth chasing.

## When the build fights you

Concurrent `next build` processes compete for memory, kill each other, and
leave a stale `.next/lock`. Symptoms are exit **137**, **143** or **144**, or
"Unable to acquire lock". It is not your code — four had accumulated here
from retries.

```bash
pkill -9 -f "next build"; pkill -9 -f "next dev"; sleep 3
rm -f .next/lock
NODE_OPTIONS="--max-old-space-size=8192" npm run build
```

Check `pgrep -f "next build|next dev" | wc -l` is 0 before starting.

## Reporting

Say which host you checked and when. "Fixed" without an environment is not a
claim anyone can act on — and if you verified on `localhost`, the change is
not on staging or production yet. Say that too.
