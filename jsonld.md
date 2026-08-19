# JSON-LD on ShearQuery

Every schema.org type this site emits, where it comes from, and why.

Counted 2026-08-11 from the source, and verified against **29 live production
pages** covering every page shape — both hubs, all seven entity types, the
Maryland set, insights, Texas and California guides, the comparison tools, the
practice deck and the best-of pages.

| | |
|---|---|
| Distinct `@type` values in the source | **58** |
| Distinct `@type` values seen live on the 29 sampled pages | **45** |
| Files emitting JSON-LD | 142 |
| Files building on `lib/schema-graph.ts` | 139 |
| Standalone `@context` documents outside a `@graph` | **0** |

The gap between 58 and 45 is not a discrepancy: thirteen types live on pages the
sample did not include. `JobPosting` is on `/careers/{slug}`, `NewsArticle` on
the TDLR updates page, `SoftwareApplication` on a single tool. Separately, five
of the 58 are passed as a parameter rather than written as a literal, so a text
search for `@type` misses them — see *Types chosen at the call site* below.

---

## The shape: one graph per page

Every page emits **one** `<script type="application/ld+json">` containing a
`@graph`, plus the root graph inherited from `app/layout.tsx`. Nothing is a
standalone object any more.

That matters more than the type list. A `@graph` lets nodes reference each other
by `@id`; separate `<script>` blocks are separate documents, and a cross-document
`@id` reference is one a consumer is free to leave unresolved. The site used to
emit 142 files' worth of disconnected objects — a `LocalBusiness` and an
`FAQPage` side by side with nothing saying the FAQ was about the business.

**`lib/schema-graph.ts` is the only place `@id`s are minted.** Every id comes
from the canonical URL, so it is unique by construction and survives a domain
move. The `#page` / `#entity` split is deliberate: the WebPage is the document,
the entity is the thing the document is about. Collapsing them makes an
`AggregateRating` read as a rating of the web page.

### A real example — `/salons/salon-rose-houston-5ee613f1`

Trimmed to the edges; the live document carries the full property set.

```jsonc
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfilePage",
      "@id": "…/salon-rose-houston-5ee613f1#page",
      "name": "Salon Rose",
      "isPartOf":   { "@id": "https://shearquery.com/#website" },
      "publisher":  { "@id": "https://shearquery.com/#organization" },
      "mainEntity": { "@id": "…/salon-rose-houston-5ee613f1#entity" },
      "breadcrumb": { "@id": "…/salon-rose-houston-5ee613f1#breadcrumb" },
      "about": [{ "@type": "Thing", "name": "Cosmetology" }]
    },
    { "@type": "BreadcrumbList", "@id": "…#breadcrumb" },
    {
      "@type": "HairSalon",
      "@id": "…#entity",
      "additionalType": "https://www.wikidata.org/wiki/Q1195245",
      "identifier":  [{ "@type": "PropertyValue", "propertyID": "Google Place ID" }],
      "containedInPlace": { "@type": "City", "name": "Houston" },
      "subjectOf":   { "@id": "…#faq" },
      "aggregateRating": { "@type": "AggregateRating" }
    },
    { "@type": "FAQPage", "@id": "…#faq", "about": { "@id": "…#entity" } },
    { "@type": "GovernmentOrganization", "@id": "https://www.tdlr.texas.gov/#organization" }
  ]
}
```

---

## Every type, by role

### Site-wide, on all 29 pages — from `app/layout.tsx`

These are the singletons every page references rather than restates.

| Type | Built in | Notes |
|---|---|---|
| `Organization` | `lib/schema-graph.ts` | The publisher. Fixed `@id`, `knowsAbout`, `areaServed`. |
| `WebSite` | `lib/schema-graph.ts` | Declares the search endpoint. |
| `SearchAction` + `EntryPoint` | `lib/schema-graph.ts` | Points at `/search?q=`, which really does read the param. |
| `Person` | `lib/author.ts` | One author node with a fixed `@id` — previously an anonymous copy on ~22 pages. |
| `ImageObject` | `lib/schema-graph.ts` | The logo, referenced by the Organization. |
| `PostalAddress` | `lib/schema-graph.ts` | |
| `Thing` | `lib/schema-graph.ts` | Topics, each `sameAs` a Wikidata concept. |
| `State` | `lib/schema-graph.ts` | Texas / California / Maryland, Wikidata-anchored. |

### Page-level document types

| Type | Where | Notes |
|---|---|---|
| `WebPage` | shared | The default document node. |
| `ProfilePage` | shared | All seven entity profile types. |
| `CollectionPage` | shared | `/texas`, `/maryland`. |
| `ItemPage` | shared | Events. |
| `BreadcrumbList` + `ListItem` | `lib/breadcrumb-jsonld.ts` | Has an `@id` so the WebPage can point at it. |
| `FAQPage` + `Question` + `Answer` | shared | A sibling node joined by `about`/`subjectOf`, **not** the page's type. |

### Business and place entities

| Type | Where |
|---|---|
| `LocalBusiness` | barbershops, best-of pages |
| `HairSalon` | `/salons/{slug}` |
| `Store` | `/stores/{slug}` |
| `EducationalOrganization` | schools, CE providers |
| `GovernmentOrganization` | shared — TDLR, CA Board, MD Labor |
| `City`, `Place`, `GeoCoordinates` | shared / entity pages |
| `AggregateRating` | entity pages |
| `Offer`, `AggregateOffer`, `MonetaryAmount`, `UnitPriceSpecification` | booth rent, services |
| `PropertyValue` | shared — typed identifiers (Google Place ID, TDLR licence number) |

### People, credentials and jobs

`Person` · `Occupation` · `EducationalOccupationalCredential` ·
`EducationalOccupationalProgram` · `JobPosting` · `Audience` ·
`BusinessAudience` · `EducationalAudience`

`hasCredential` is emitted **only** where the row states the person is licensed —
asserting a credential for a named individual who does not hold one is the most
damaging error this markup could make.

### Editorial and reference

`Article` · `TechArticle` · `NewsArticle` · `CreativeWork` · `HowTo` ·
`HowToStep` · `ItemList` · `Dataset` · `Table` · `Legislation` ·
`DefinedTerm` · `DefinedTermSet` · `Course` · `CourseInstance` ·
`WebApplication` · `SoftwareApplication` · `Service` · `Event`

### The 13 in source but not on the sampled pages

Present in the code, just not on a page this sample happened to include:

```
AboutPage · AggregateOffer · BusinessAudience · CourseInstance · CreativeWork
EducationalOccupationalCredential · EducationalOccupationalProgram · JobPosting
NewsArticle · Service · SoftwareApplication · Table · UnitPriceSpecification
```

`EducationalOccupationalCredential` and `Occupation` are the interesting pair —
they only render on a barber or cosmetologist page whose row states the person
is licensed, so whether they appear at all depends on the data, not the route.

### Types chosen at the call site

Five never appear as a literal `"@type"` — they are parameters to
`webPageNode({ type })` and `articleGraph({ type })`, so a text search for
`@type` misses them:

```
WebPage · CollectionPage · ProfilePage · ItemPage · AboutPage
Article · TechArticle · HowTo
```

---

## External anchors

Types alone are not enough to reconcile our entities with anyone else's. Two
mechanisms carry that:

- **`sameAs` to Wikidata** on states, cities, occupations and topics. Every QID
  was read back from the Wikidata API — searching "Texas" also returns a
  Scottish rock band, and "barber" returns a surname. Anything unverified is
  absent; a wrong `sameAs` asserts our entity **is** that other thing.
- **`identifier` as `PropertyValue` with a `propertyID`** naming the registry —
  the Google Place ID, and for schools and CE providers the TDLR licence number.
  A bare number is unverifiable; the `propertyID` is what makes it checkable.

---

## Types we keep that no longer earn rich results

Two of the most-used types on this site produce no visible search feature. They
stay anyway, and the reason is worth writing down so nobody "cleans them up".

Dates below are from Google's own changelog, re-verified 2026-08-11. An earlier
version of this file had two of them wrong in the same way — it reported the
date the DOCUMENTATION was removed as though it were the date the FEATURE
stopped appearing. Those are separate events, often more than a year apart, and
conflating them makes the markup look more current than it is.

- **`HowTo`** — the rich result stopped appearing in **August 2023**, on
  **desktop and mobile** (an earlier version of this file said desktop only,
  which is wrong). The documentation was removed on **14 September 2023**, and
  `/search/docs/appearance/structured-data/howto` now returns a hard **404**.
  Google's guidance at the time: *"you can drop this structured data from your
  site, [but] there's no need to proactively remove it. Structured data that's
  not being used does not cause problems for Search."*
- **`FAQPage`** — the rich result stopped appearing in Google Search on
  **7 May 2026**. Search Console support — rich result reporting and the
  testing tools — was discontinued in **January 2026**, i.e. *before* the
  feature was withdrawn, not after; an earlier version of this file said
  "June–August 2026", which was the documentation-removal window. The
  documentation was removed on **15 June 2026**, and
  `/search/docs/appearance/structured-data/faqpage` now **301s to the changelog
  entry** rather than to a replacement page.

Neither type appears in Google's current structured-data navigation, which
lists **38** pages as of 2026-08-11 (see `lib/google-search-docs.ts`).

Both remain because the audience for this markup is no longer only Google. The
`.md` layer and the graph exist to be read by AI crawlers, and an explicit
`about` edge from an FAQ to the business it describes tells an assistant more
than a rich result ever did.

Sources:
[Search Central changelog](https://developers.google.com/search/updates#removing-faq-rich-result) — the
authority for both, and where the retired FAQ page now redirects ·
[Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
(2023 blog post, still live)

The old citation here pointed at `/search/docs/appearance/structured-data/faqpage`,
which is now a 301. It still resolves, so nothing looked broken — a stale
citation that redirects is harder to notice than one that 404s, and worth
re-checking rather than trusting.

---

## Alignment with Google's documentation

Checked 2026-08-11 against `lib/google-search-docs.ts`, the verified map of all
153 Search Central doc pages. Google currently documents **38** structured-data
types.

**Types we emit that Google documents** — `Article`, `BreadcrumbList`,
`ItemList` (carousel), `Course`, `Dataset`, `Event`, `ImageObject`,
`JobPosting`, `LocalBusiness`, `Organization`, `ProfilePage`,
`SoftwareApplication`.

**Documented types that do not apply to this site**, listed so nobody
re-litigates them: `Product`, `product-snippet`, `product-variants`,
`merchant-listing`, `return-policy`, `shipping-policy`, `loyalty-program` are
ecommerce; `Movie`, `Recipe`, `Book`, `math-solvers`, `vacation-rental` are
other verticals; `paywalled-content` does not describe us. `factcheck` and
`speakable` are both restricted to approved publisher programmes, so emitting
them would be a policy problem rather than an opportunity.

**Genuine gaps, in order of strength:**

1. **`Quiz` / education-qa** — the strongest. `/tools/texas-barber-exam-practice-deck`
   and `/tools/texas-cosmetology-exam-practice-deck` are exactly the shape this
   type describes, and both already emit JSON-LD, just not this. Read
   `/search/docs/appearance/structured-data/education-qa` for the eligibility
   rules before adding it — the type has requirements about answer visibility
   that our decks may or may not meet.
2. **`VideoObject`** — moot until there is video on a page. There is now a
   YouTube channel, so this moves from "not applicable" to "not yet".
3. **`DiscussionForumPosting`** — moot for a different reason. `/discussions` is
   deliberately noindexed and dropped from the sitemap (`lib/public-routes.ts`),
   so marking it up would describe a page we are asking Google not to index.
   Only relevant if that decision is reversed.
4. **`EmployerAggregateRating`** — we hold hiring signals and booth-rent data on
   shops, but the type is designed for employer-review sites reporting ratings
   OF an employer. We do not collect those. Weak fit; noted so it is not
   mistaken for an easy win.

**No documented type we emit is deprecated except the two above**, and the
per-type doc pages for everything else in the list resolve.

---

## Reproducing this

The source count:

```bash
grep -rho '"@type": *"[A-Za-z]*"' app components lib \
  | sed 's/.*"\([A-Za-z]*\)"$/\1/' | sort -u | wc -l
```

The live count and the no-dangling-reference check:

```bash
node scripts/validate_knowledge_graph.js https://shearquery.com
```

That script asserts, on every page it checks: every block parses, nothing sits
outside a `@graph`, no `@id` reference dangles, no id defines two different
types, and the three root nodes are present. Unit tests prove the builders in
`lib/schema-graph.test.ts`; only a rendered page proves the assembly.
