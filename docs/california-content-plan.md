# California content plan

Research date: 2026-08-09. Sources: 274 PDFs in `reference/California Exam Prep
Files`, Google Ads Keyword Planner (geo `21137` = California, real volumes),
and the live database.

**Headline: do not mirror Texas.** The Texas set is 40 routes built around
requirements guides, kit lists and transfer guides. In California those are the
*low*-volume terms, two of the page types cannot legally exist, and the
highest-value work is not a new page at all.

---

## 1. The blocker, and it outranks every page idea below

California exam data is loaded but **not connected to the schools**.

| | |
|---|---|
| `school_exam_stats` rows for CA (BBC, Q1 2026) | **543** |
| Distinct schools in those stats | **209** |
| Rows matched to a school entity | **80** (76 exact + 4 fuzzy) |
| Rows `unmatched` | **463 — 85%** |
| CA schools in the entity tables | **184** (158 cosmetology + 26 barber) |
| CA schools showing a 2026 pass rate | **0** |
| CA schools showing tuition | **0** |

So all 184 California school pages are thin — name, address, Google rating,
nothing else. Meanwhile the licensing data that would make them unique is
sitting in the same database, unjoined.

**Why this beats writing guides:** school-name queries are the highest-volume
California searches in the whole keyword pull.

| Query | Vol/mo |
|---|---|
| palomar institute of cosmetology san marcos ca | **2,400** |
| milan institute visalia california | 1,900 |
| san francisco institute of esthetics and cosmetology san francisco ca | 1,900 |
| milan institute palm desert ca | 1,600 |
| beauty schools in los angeles | 1,300 |
| san diego cosmetology | 1,300 |
| santa ana beauty academy santa ana ca | 880 |

One school out-searches every California guide term combined. There are 184 of
them and they currently say nothing a student can't get from Google Maps.

**Do this first.** Match the 463 unmatched rows. The Texas matcher already
exists; this is a name-matching job against `source_school_name` / `source_city`,
not new infrastructure.

---

## 2. Two Texas page types that must NOT be built for California

**Practical exam kit lists.** California has **no practical exam**. The board:
*"Effective January 1, 2022, the practical exam is no longer required for all
license types."* Texas has six kit-list pages; California's equivalent count is
zero. Building them would invent a requirement that does not exist.

**Transfer / reciprocity guides.** Real volume:

| Query | Vol/mo |
|---|---|
| transfer cosmetology license to california | 20 |
| california cosmetology license reciprocity | 10 |
| california cosmetology hours required | 10 |

Not worth a page. `/texas-california-license-reciprocity` already covers the
one direction that matters.

---

## 3. What to build, in order, with the volume behind it

### Tier 1 — Renewal (~4,000+/mo combined)

The largest guide cluster in California, and bigger than "requirements" by a
factor of ten.

| Query | Vol/mo |
|---|---|
| www barbercosmo ca gov license renewal | 880 |
| california cosmetology license renewal | 720 |
| california nail license renewal | 720 |
| ca cosmetology license renewal online | 590 |
| california cosmetology license renewal online | 590 |
| renew cosmetology license ca online | 590 |
| barbercosmo ca gov license renewal | 480 |
| board of barbering and cosmetology california license renewal | 390 |
| ca board of barbering and cosmetology license renewal | 390 |
| california esthetician license renewal | 140 |

Note how many are **navigational** — people typing the board's URL into Google.
They want the renewal task done, not an explainer. The page must lead with the
action and the direct link, then answer fee, cycle and CE.

→ `/california-cosmetology-license-renewal`, `/california-barber-license-renewal`,
and a nail/esthetician variant.

### Tier 2 — The April 2026 exam change (near-zero competition, high value)

This is the strongest *unique* asset in the reference folder, and nobody has
written it up.

PSI completed a new validation study; **new content outlines took effect
1 April 2026**. The board's letter to schools gives exact weightings, 2020 vs
2025. The shifts are dramatic:

| License | Topic | 2020 | 2025 |
|---|---|---|---|
| **Nail Technician** | Safety & Infection Control | 38% | **50%** |
| **Nail Technician** | Nail Care | 49% | **22%** |
| Cosmetologist | Haircutting | 12% | **3%** |
| Cosmetologist | Haircoloring | 0% | **10%** |
| Cosmetologist | Eyelash & Eyebrow | 0% | **4%** |
| Barber | Chemical Texture Services | 18% | **7%** |
| Barber | Haircoloring | 0% | **7%** |
| Esthetician | Skin Care | 27% | **17%** |
| Esthetician | Eyelash & Eyebrow | 0% | **6%** |

The nail exam stopped being mostly about nails. Anyone studying from
pre-2026 materials is studying the wrong weightings — and that is a headline,
not a footnote.

Exam structures, from the same source:

| License | Questions | Scored | Time |
|---|---|---|---|
| Cosmetologist | 110 | 100 | 2 hrs |
| Barber | 95 | 85 | 2 hrs |
| Esthetician | 85 | 75 | 1.5 hrs |
| Nail Technician | 65 | 60 | 1.5 hrs |
| Electrologist | 55 | 50 | 1.5 hrs |

→ One page per license, plus a hub: *"What changed in the California exam on
1 April 2026."*

### Tier 3 — License guides by type (~600/mo each for the big ones)

| Query | Vol/mo |
|---|---|
| california cosmetology license | 720 |
| beauty license california | 720 |
| beautician license california | 720 |
| california esthetician license | 590 |
| aesthetician license california | 590 |
| california barber license | 480 |
| nail tech license california | 210 |

**Two license types Texas doesn't have — build these, no Texas equivalent
exists to copy:**

- **Hairstylist** — California-only. Has its own application *and its own
  candidate bulletin* in the reference set.
- **Electrologist** — own application, own exam (55 questions).

Note "beauty license" and "beautician license" at 720 each. Those are how real
people phrase it; the pages should carry that language, not only the statutory
term.

### Tier 4 — Apprenticeship (small but structurally interesting)

| Query | Vol/mo |
|---|---|
| california cosmetology apprenticeship | 70 |
| california barbering and cosmetology apprenticeship | 20 |
| california cosmetology apprenticeship program | 20 |

California runs an apprenticeship pathway to licensure. The reference set has
`Affidavit of Experience Form C` and apprentice exam results
(`apprentice_rslts_01_26_03_26.pdf`). Low volume, but it is a real alternate
route and almost nobody explains it.

---

## 4. SEO specifics

- **Titles must carry the colloquial term.** "Beauty license" and "beautician
  license" are 720/mo each; "cosmetology license requirements" is 70.
- **Renewal pages are navigational-intent.** Lead with the action and the
  board's own renewal URL. A visitor who wanted to renew and got an essay
  bounces, and dwell time is the signal that matters.
- **Canonical** via `alternates` using `SITE_URL` — see `.claude/skills/publish-page`.
- **Descriptions 110–160 chars**, composed with `lib/seo-description.ts` so
  clauses drop rather than clip.
- **No `FAQPage` JSON-LD.** It was withdrawn from Google Search in 2026 — 63
  existing pages carry markup that now earns nothing. Use `Article` and
  `BreadcrumbList`. `Dataset` is worth testing on the pass-rate pages.(Lets Keep this since it does not hurt i would rather keep it
  )
- **Do not reuse Texas figures.** Every fee, hour count and CE rule differs.
  California hour requirements, CE and fees must come from the CA reference
  PDFs or barbercosmo.ca.gov, per `CLAUDE.md`.

## 5. LLM / GEO specifics

- The `.md` twin is automatic for any markdown-eligible route — but verify each
  new page renders real prose, per `.claude/skills/geo-audit`.
- **The exam-weighting tables are the most citable thing here.** An assistant
  asked "what's on the California cosmetology exam" has no good source today.
  Publish the weightings as a real HTML table, not an image, and the `.md`
  twin carries it verbatim.
- Update `public/llms.txt` — it currently describes a Texas-focused platform
  and does not mention California coverage at all.
- Add California to the MCP server's tool descriptions once school matching is
  done; `compare_barber_cosmetology_schools` already accepts a city filter but
  the CA rows carry no pass rate to return.

---

## 6. What I verified, and what I did not

**Verified from primary documents:**
- PSI administers, `test-takers.psiexams.com/cabacos`, bulletin © April 2026.
- No practical exam — board's own page.
- The 2020 vs 2025 weighting tables and exam structures — board letter dated
  21 Nov 2025, effective 1 April 2026.
- 184 CA schools, 543 CA exam-stat rows, 463 unmatched — queried directly.
- All keyword volumes — Google Ads Keyword Planner, California geo target.

**Now verified — 2026-08-10, recorded in `lib/ca-sources.ts`:**

**Training hours** (Business & Professions Code, read on leginfo):

| Licence | Hours | Section | Texas |
|---|---|---|---|
| Barbering / Cosmetology | **1,000** | BPC 7362.5 | 1,000 — same |
| Hairstylist | **600** | BPC 7363 | *no equivalent* |
| Esthetician (Skin Care) | **600** | BPC 7364 | 750 — **differs** |
| Manicurist (Nail Care) | **400** | BPC 7365 | 600 — **differs** |
| Electrologist | **600** | BPC 7366 | *no equivalent* |

All phrased "not less than X hours of practical and technical instruction."
Note the trap: cosmetology matches Texas exactly, which makes the other four
look safe to copy. Two of them are wrong by 150–200 hours.

**Renewal cycle** — BPC 7415: licences are issued for a **two-year period** and
expire "at midnight on the last day of the month of issuance by the board." Not
a fixed calendar date, which matters for any renewal-reminder copy.

**Fees** — BPC 7423, and these are **caps, not prices**. Every line reads "not
more than", so the board sets the real amount underneath:

- Individual renewal **≤ $50** · establishment renewal ≤ $40
- Initial: cosmetologist / barber / electrologist / hairstylist ≤ $50,
  esthetician ≤ $40, manicurist ≤ $35, apprentice ≤ $25
- **Delinquency fee: 50% of the renewal fee in effect** — a formula, so exact
- Expired licences renewable **within five years** on accrued fees

**Continuing education: California requires none.** The complete 164-page Act
and Regulations book contains "continuing education" exactly once, and
conditionally — "meet current continuing education requirements, *if
applicable*, prescribed by this chapter." The chapter prescribes none. No CE
section among the Act's 145 sections or the 80 regulations; zero mentions
across 301 board documents.

That is a publishable contrast: **Texas requires 4 hours every two years,
California requires zero.** Nobody frames it that way, and anyone moving
between the states needs it.

**Renewal happens on BreEZe** (`breeze.ca.gov`), DCA's system — not on
barbercosmo.ca.gov. That is what the "renewal online" cluster is looking for
and what a renewal page must link to first.

---

## 7. Still not settled

- **The actual renewal fee.** BPC 7423 caps it at $50; the board charges some
  amount at or below that. It is not in the statute, not in the Act and
  Regulations book, and not in any of the 301 mirrored PDFs — the board
  publishes it as a web page. Cite the cap *as a cap*, or fetch the live
  figure before publishing a number.
- **Whether the hour minimums have been amended.** `California Notice of
  Approval (Effective July 1, 2026).pdf` and the proposed-language documents
  indicate active rulemaking. The BPC sections were read 2026-08-10; check the
  Notice of Approval before treating them as stable.

## 8. Two fetching notes for whoever picks this up

- **barbercosmo.ca.gov and leginfo both fail TLS verification here** — "unable
  to get local issuer certificate" — and need `curl -k`. That is not the site
  being down. It is the fourth regulator site in this repo to do it, after
  TDLR, NACCAS and PCS. Browsers have the full chain and open them fine.
- **Two false positives caught during this research**, both from
  case-insensitive substring matching: a vendor probe reported "PSI" on Ohio's
  board site (matching inside *colla-**psi**-ble*), and a filename search for
  `CE ` matched *"Experien**ce** Form"*. Word boundaries, or the finding is
  noise.

---

# Addendum — 2026-08-10: the Sunset Review data

Four files added: `SUNSET-REVIEW-2026-DATA.md`, `exam-pass-rates.json`,
`OCCUPATIONAL-ANALYSES.md`, `occupational-analyses.json` — extracted from the
board's 517-page 2026 Sunset Review Report.

I checked every finding against Google Ads volume before recommending
anything. **The most striking finding in the set has no search demand.** That
is worth saying plainly rather than dressing up.

## A. One clear new page — esthetician & barber earnings (~510/mo)

The only theme in the new data with real demand:

| Query | Vol/mo |
|---|---|
| how much do estheticians make in california | **210** |
| how much do estheticians make in ca | 110 |
| cosmetologist salary california | 70 |
| barber salary california | 70 |
| average barber salary california | 30 |
| + LA / San Diego variants | ~50 |

Everyone answering this — Indeed, ZipRecruiter, salary.com — quotes an annual
figure that assumes full-time work. **The board's own survey of working
licensees says almost nobody is full-time:**

| Hours/week | Barbering | Esthetics | Manicurist | Electrologist |
|---|---|---|---|---|
| 9 or less | 12.8% | **29.5%** | 28.9% | 31.2% |
| 40 or more | **33.5%** | **8.7%** | 13.2% | 11.0% |

Only **8.7% of California estheticians work 40+ hours a week**. And 59.8% see
five clients a day or fewer.

So the honest answer to "how much do estheticians make in California" is that
the annual figures everyone quotes describe the 8.7%. That is a genuinely
different answer to a question with 320/mo behind it, sourced from the
regulator rather than from job-ad scrapes — and it is defensible because it is
a survey of licensees, not an estimate.

Pair it with the booth-rent data already on the site: 41.5% of estheticians are
sole owners, so for most of them "salary" is revenue minus a chair.

→ `/california-esthetician-salary` and `/california-barber-salary`.

## B. The language gap — publish it, but not for traffic

The finding is real and I verified it is not a composition artefact. It holds
inside every licence:

| Licence, FY2024/25 first-time | English | Spanish | Gap |
|---|---|---|---|
| Cosmetology | 71% (n=6,747) | **26%** (n=769) | **−45 pts** |
| Manicurist | 81% (n=2,662) | 45% (n=233) | −36 pts |
| Barber | 60% (n=3,611) | 32% (n=360) | −28 pts |
| Esthetician | 78% (n=6,216) | 52% (n=130) | −26 pts |

It is specifically Spanish — **Chinese-language cosmetology candidates
outperform English, 77% to 71%.** And the cosmetology gap is widening: 33 → 41
→ 41 → 45 points across four years.

**Search demand: zero.** A dedicated keyword pull on Spanish-language exam
terms, pass-rate terms, difficulty terms and retake terms returned **11
keywords with volume, all of them salary**. Nobody is googling this.

Publish it anyway, but for the right reasons and with the right expectation:

- **It is the citable asset.** An assistant asked why Spanish-speaking
  candidates fail California's exam has no source today. That is a question
  with no search volume and real currency.
- **It extends the Milady/PSI wording insight into a second language.** If
  English candidates lose marks to unfamiliar phrasing, a translated exam is
  the same problem with the volume turned up.
- **It is the strongest earned-media asset on this site.** 769 candidates a
  year, a widening gap, and a regulator's own numbers.

Do not put it in the content plan's traffic column. It belongs in the
credibility column, and it should live inside the exam-prep pages rather than
as a standalone URL chasing searches that do not exist.

## C. Market sizing — not content, but worth having

Active licensees, FY2024/25 (Table 6):

| Licence | Count | Trend since 2021/22 |
|---|---|---|
| Cosmetology | 232,274 | **−15,622** |
| Manicurist | 97,995 | −1,637 |
| Esthetician | 88,344 | **+7,417** |
| Barber | 33,160 | **+3,433** |
| Establishments | 49,144 | **−3,191** |
| Electrology | 1,117 | −59 |

Cosmetology is shrinking while barbering and esthetics grow. Establishments
are down 3,191 in four years. That is ad-sales and market context, not an SEO
page — but it says which segments are worth building for.

Also: **Chinese-language candidates grew 29-fold in four years** (92 → 2,651),
now the third-largest exam language. No content follows from it yet; it is the
kind of thing that matters in twelve months.

## D. What I would not build from this data

- **A pass-rate-by-language standalone page.** Zero demand; see B.
- **A retake guide.** Retakes pass at 38.1% against 70.4% first-time — a real
  and alarming number — but "retake" and "failed state board" returned no
  volume at all.
- **Anything from the enforcement tables.** `exam-pass-rates.json` carries
  enforcement rows (`Accusations Filed`, `Amount Collected`) mixed into the
  same `license` field from the same table extraction. Filter to real licence
  names before aggregating, or the numbers will be nonsense.
