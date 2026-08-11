/**
 * The site's knowledge graph: node identity, external anchors, and the shared
 * nodes every page connects to.
 *
 * WHY THIS FILE EXISTS. Before it, 140 files emitted JSON-LD and five of them
 * emitted a `@graph`. Everywhere else the markup was a pile of disconnected
 * islands — a LocalBusiness object and an FAQPage object sitting in two
 * separate <script> tags on the same page, with nothing stating that the FAQ is
 * about that business, that the business is listed by this publisher, or that
 * the publisher is the same organization named on every other page.
 *
 * A parser reading that gets a stack of cards. It cannot answer "which shops
 * does this site cover in Houston", "who wrote this", or "is the Rodriguez
 * Barber Shop on /shop/ the same entity as the one in the Houston list",
 * because nothing in the markup says so.
 *
 * Three things turn cards into a graph, and this file supplies all three:
 *
 *   1. STABLE `@id`s. A node without an `@id` cannot be referenced, so no edge
 *      can point at it. Every id here is minted from the canonical URL, which
 *      means it survives a domain move (it resolves through SITE_URL) and can
 *      never collide (URLs are already unique).
 *
 *   2. EDGES. `publisher`, `isPartOf`, `about`, `mainEntity`, `areaServed`,
 *      `containedInPlace`, `alumniOf`. These are the graph.
 *
 *   3. EXTERNAL ANCHORS. `sameAs` to Wikidata and `identifier` carrying the
 *      TDLR licence number or the Google Place ID. Without these the graph is
 *      internally consistent and externally unreconcilable — nothing lets an
 *      outside index decide that our "Texas" is the US state rather than the
 *      band, or that our school row and their school record are one entity.
 *
 * WHAT MUST NOT DRIFT. Every `@id` must be globally unique and must not change
 * once published — a changed `@id` reads as a different entity, which is the
 * one failure mode worse than having no `@id` at all. Mint them only through
 * the helpers below.
 */
import { SITE_URL } from "./site";
import { AUTHOR, AUTHOR_NODE_ID } from "./author";
import { cleanPlace } from "./seo-description";

/* ------------------------------------------------------------------ *
 * Node identity
 * ------------------------------------------------------------------ */

/**
 * The three singleton nodes. Fragment ids on the origin rather than on a page,
 * because these are site-wide entities that do not belong to any one URL — the
 * Organization is not "about" the homepage, it publishes all of it.
 */
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
/**
 * Re-exported from lib/author.ts rather than restated. `authorSchema()` embeds
 * this id in ~22 article pages; if the two files each minted their own string
 * the graph would quietly split one person into two entities.
 */
export const AUTHOR_ID = AUTHOR_NODE_ID;

/** A bare reference to a node defined elsewhere in the graph (or on another page). */
export const ref = (id: string) => ({ "@id": id });

/**
 * Per-page ids. The `#entity` / `#page` split matters and is not decoration:
 * the WebPage is the document, the entity is the thing the document is about.
 * Collapsing them is the most common structured-data mistake on directory
 * sites — it makes the business's `url` and the page's `url` the same node, so
 * a rating attached to the page reads as a rating of the document.
 *
 * `path` is always the canonical path with a leading slash and no origin.
 */
export const entityId = (path: string) => `${SITE_URL}${path}#entity`;
export const pageId = (path: string) => `${SITE_URL}${path}#page`;
export const breadcrumbId = (path: string) => `${SITE_URL}${path}#breadcrumb`;
export const faqId = (path: string) => `${SITE_URL}${path}#faq`;
export const placeId = (path: string) => `${SITE_URL}${path}#place`;

/* ------------------------------------------------------------------ *
 * External anchors
 * ------------------------------------------------------------------ */

/**
 * Wikidata QIDs, each verified against the Wikidata search API on 2026-08-10 by
 * reading back the entity's own description.
 *
 * ACCURACY IS NOT OPTIONAL HERE. `sameAs` is an identity assertion, not a link
 * — pointing at the wrong QID does not merely fail to help, it actively tells
 * every consumer that our entity IS that other thing. Two of the obvious
 * lookups returned traps: searching "Texas" also returns Q916484, a Scottish
 * rock band, and searching "barber" returns Q15785531, a surname. Both would
 * have been silently accepted by a script that took the first result.
 *
 * Anything not verified is simply absent. An entity with no anchor is a smaller
 * loss than an entity with a wrong one.
 */
export const WIKIDATA = {
  // States
  texas: "https://www.wikidata.org/wiki/Q1439",
  california: "https://www.wikidata.org/wiki/Q99",
  maryland: "https://www.wikidata.org/wiki/Q1391",
  // Regulators. No QID exists for the California Board of Barbering and
  // Cosmetology, PSI Services or NACCAS — searched, nothing returned. Those
  // carry their official URL in `sameAs` instead, which is weaker but true.
  tdlr: "https://www.wikidata.org/wiki/Q7707637",
  mdLabor: "https://www.wikidata.org/wiki/Q6781307",
  // Occupations and place types. Q55187 is the occupation "hairdresser";
  // there is no separate occupation item for "barber" that resolves cleanly.
  hairdresser: "https://www.wikidata.org/wiki/Q55187",
  cosmetology: "https://www.wikidata.org/wiki/Q2474068",
  aesthetician: "https://www.wikidata.org/wiki/Q12367504",
  nailTechnician: "https://www.wikidata.org/wiki/Q11325221",
  barbershop: "https://www.wikidata.org/wiki/Q21980641",
  beautySalon: "https://www.wikidata.org/wiki/Q1195245",
} as const;

/**
 * City anchors, keyed by lowercase city name.
 *
 * Deliberately a short curated map rather than a lookup at render time. The
 * entity tables hold thousands of distinct city strings, most of them
 * unverifiable without a network call per page, and a wrong city QID is the
 * same identity error as a wrong state one. Cities not listed here still get a
 * real graph edge — `containedInPlace` up to the State node — they just do not
 * get an external anchor.
 *
 * Verified against the Wikidata search API on 2026-08-10.
 */
export const CITY_WIKIDATA: Record<string, string> = {
  houston: "https://www.wikidata.org/wiki/Q16555",
  dallas: "https://www.wikidata.org/wiki/Q16557",
  "san antonio": "https://www.wikidata.org/wiki/Q975",
  austin: "https://www.wikidata.org/wiki/Q16559",
  "fort worth": "https://www.wikidata.org/wiki/Q16558",
  "el paso": "https://www.wikidata.org/wiki/Q16562",
  baltimore: "https://www.wikidata.org/wiki/Q5092",
};

/** US state postal code -> the canonical State node for it. */
const STATE_BY_CODE: Record<string, { name: string; sameAs: string }> = {
  TX: { name: "Texas", sameAs: WIKIDATA.texas },
  CA: { name: "California", sameAs: WIKIDATA.california },
  MD: { name: "Maryland", sameAs: WIKIDATA.maryland },
};

/**
 * A schema.org State node for a postal code, anchored to Wikidata.
 * Returns null for a state we have not verified rather than guessing.
 */
export function stateNode(code: string | null | undefined) {
  if (!code) return null;
  const s = STATE_BY_CODE[code.toUpperCase()];
  if (!s) return null;
  return { "@type": "State", name: s.name, sameAs: [s.sameAs] } as const;
}

/**
 * A Place node for a city, nested inside its state.
 *
 * `containedInPlace` is the edge that makes a city page and a shop page agree
 * on what "Houston" means without either one having to enumerate the other.
 */
export function cityNode(city: string | null | undefined, stateCode: string | null | undefined) {
  /**
   * The `city` column is not clean. 556 barbershop rows carry a ZIP glued onto
   * the city — "Houston 77069" — which broke this two ways before the
   * normalisation was added: it published a City whose name is not a city, and
   * because the Wikidata map is keyed on the city name, "houston 77069" missed
   * every anchor. The whole external-reconciliation layer was silently off for
   * the largest city on the site.
   *
   * `cleanPlace` is reused rather than reimplemented — it already strips the
   * trailing ZIP for meta descriptions, and two copies of this rule would drift.
   */
  const name = cleanPlace(city);
  if (!name) return null;
  const anchor = CITY_WIKIDATA[name.toLowerCase()];
  const parent = stateNode(stateCode);
  const node: Record<string, unknown> = { "@type": "City", name };
  if (anchor) node.sameAs = [anchor];
  if (parent) node.containedInPlace = parent;
  return node;
}

/* ------------------------------------------------------------------ *
 * Identifiers
 * ------------------------------------------------------------------ */

/**
 * Typed external identifiers as PropertyValue nodes.
 *
 * `propertyID` is what makes these machine-usable rather than decorative. A
 * bare string in `identifier` says "this entity has some id"; a PropertyValue
 * with propertyID "TDLR License Number" says which registry the id belongs to,
 * which is the difference between an assistant being able to verify a licence
 * and merely being able to repeat a number.
 *
 * Every field is optional and omitted when absent — an `identifier` array
 * containing an empty or null value is worse than no array, because it asserts
 * an identity that resolves to nothing.
 */
export function identifiers(input: {
  /** State licence number, e.g. TDLR or the Maryland boards. */
  licenseNumber?: string | null;
  /** The registry the licence number belongs to. Required if licenseNumber is set. */
  licenseAuthority?: string;
  /** Google Places ID. Stable across name and address changes, which is exactly why it is here. */
  googlePlaceId?: string | null;
  /** US Dept. of Education OPE ID, for schools carrying College Scorecard data. */
  opeId?: string | null;
}) {
  const out: { "@type": "PropertyValue"; propertyID: string; value: string }[] = [];
  if (input.licenseNumber && input.licenseAuthority) {
    out.push({
      "@type": "PropertyValue",
      propertyID: `${input.licenseAuthority} License Number`,
      value: String(input.licenseNumber),
    });
  }
  if (input.googlePlaceId) {
    out.push({ "@type": "PropertyValue", propertyID: "Google Place ID", value: String(input.googlePlaceId) });
  }
  if (input.opeId) {
    out.push({ "@type": "PropertyValue", propertyID: "OPE ID", value: String(input.opeId) });
  }
  return out.length > 0 ? out : undefined;
}

/* ------------------------------------------------------------------ *
 * Topics — the tags that actually resolve
 * ------------------------------------------------------------------ */

/**
 * Semantic tags.
 *
 * WHY THIS REPLACES KEYWORD STRINGS. 146 pages carry `metadata.keywords`, and
 * Google has stated since 2009 that it disregards the keywords meta tag in web
 * ranking. Those strings are not harmful, but they do no work: "barber school
 * houston" is an unresolvable string that a consumer has to guess the meaning
 * of.
 *
 * `about` and `mentions` carrying Thing nodes with a Wikidata `sameAs` are
 * consumed. They say the page is about the concept, not that it contains the
 * word — which is the whole difference between a tag and a topic.
 */
const TOPICS = {
  barbering: { name: "Barbering", sameAs: WIKIDATA.hairdresser },
  cosmetology: { name: "Cosmetology", sameAs: WIKIDATA.cosmetology },
  esthetics: { name: "Esthetics", sameAs: WIKIDATA.aesthetician },
  nails: { name: "Nail technology", sameAs: WIKIDATA.nailTechnician },
  barbershop: { name: "Barbershop", sameAs: WIKIDATA.barbershop },
  salon: { name: "Beauty salon", sameAs: WIKIDATA.beautySalon },
} as const;

export type TopicKey = keyof typeof TOPICS;

/** Thing nodes for the given topic keys, ready for `about` or `mentions`. */
export function topics(...keys: TopicKey[]) {
  return keys.map((k) => ({ "@type": "Thing", name: TOPICS[k].name, sameAs: [TOPICS[k].sameAs] }));
}

/* ------------------------------------------------------------------ *
 * Regulators
 * ------------------------------------------------------------------ */

/**
 * The three state regulators as GovernmentOrganization nodes.
 *
 * Shared so the Texas hub, the Maryland hub, every licensing guide and every
 * entity page in a given state all reference the SAME regulator entity rather
 * than each minting a near-duplicate. Before this, /texas and /maryland each
 * described their regulator inline with slightly different wording.
 */
export const REGULATORS = {
  tx: {
    "@type": "GovernmentOrganization",
    "@id": "https://www.tdlr.texas.gov/#organization",
    name: "Texas Department of Licensing and Regulation",
    alternateName: "TDLR",
    url: "https://www.tdlr.texas.gov/",
    sameAs: [WIKIDATA.tdlr],
  },
  ca: {
    "@type": "GovernmentOrganization",
    "@id": "https://www.barbercosmo.ca.gov/#organization",
    name: "California Board of Barbering and Cosmetology",
    url: "https://www.barbercosmo.ca.gov/",
  },
  md: {
    "@type": "GovernmentOrganization",
    "@id": "https://labor.maryland.gov/#organization",
    name: "Maryland Department of Labor",
    alternateName: "Maryland DLLR",
    url: "https://labor.maryland.gov/",
    sameAs: [WIKIDATA.mdLabor],
  },
} as const;

/** The regulator for a postal state code, or null if we do not cover that state. */
export function regulatorFor(code: string | null | undefined) {
  if (!code) return null;
  const key = code.toUpperCase();
  if (key === "TX") return REGULATORS.tx;
  if (key === "CA") return REGULATORS.ca;
  if (key === "MD") return REGULATORS.md;
  return null;
}

/* ------------------------------------------------------------------ *
 * The singleton nodes
 * ------------------------------------------------------------------ */

/**
 * The publisher.
 *
 * `knowsAbout` is the field doing the work an assistant actually reads: it
 * states the organization's subject-matter scope in resolvable Thing nodes, so
 * "which site knows about Texas barber licensing" has a machine answer.
 */
export function organizationNode(opts?: { name?: string; description?: string; origin?: string }) {
  /**
   * `origin` exists for the texasbarbering tenant, which serves from its own
   * host under its own name and declares itself canonical. Giving it the
   * ShearQuery `@id` would assert that two differently-named organizations are
   * one entity; giving it no id at all would leave its own pages unable to
   * reference their publisher. So it gets an id rooted at its own origin.
   */
  const origin = opts?.origin ?? SITE_URL;
  return {
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: opts?.name ?? "Inner G Complete Agency",
    url: origin,
    logo: {
      "@type": "ImageObject",
      "@id": `${origin}/#logo`,
      url: `${origin}/icon-dark-32x32.png`,
    },
    image: ref(`${origin}/#logo`),
    /**
     * GATED ON TENANT ON PURPOSE — this is the one field in the node where
     * getting it wrong asserts something false rather than merely unhelpful.
     *
     * `sameAs` says "this is the same entity". The four ShearQuery profiles
     * belong to the organization publishing shearquery.com. The texasbarbering
     * tenant renders through this same function with its own name and its own
     * `@id`, so adding them unconditionally would have "Texas Barbering
     * Intelligence" claim ShearQuery's Instagram — a different entity
     * announcing ownership of accounts that are not its own. It gets no
     * `sameAs` rather than a plausible-looking one, because we hold no profile
     * that unambiguously identifies it.
     *
     * Google documents the field as "a URL to your organization's profile page
     * on a social media or review site", and describes this class of property
     * as working behind the scenes to DISAMBIGUATE one organization from
     * another. That is the whole value here — it is an identity anchor, not a
     * ranking lever, and nothing in the docs claims otherwise.
     *
     * SEPARATE FROM the Search Console platform properties for the same four
     * accounts. Those are reporting and live in Google's UI; this is an
     * assertion and lives in the markup. Neither substitutes for the other —
     * see the platform-properties section in CLAUDE.md.
     *
     * THE TEST EXCLUDES THE TENANT, NOT "ANYTHING THAT ISN'T PRODUCTION".
     * The first version compared `origin === SITE_URL`, which is true only on
     * https://shearquery.com — so localhost and every Vercel preview silently
     * dropped the field. That is worse than the bug it guards against: markup
     * that differs between preview and production cannot be verified before
     * deploy, and the absence looks like a rendering fault rather than a
     * deliberate gate. Naming the tenant we are excluding keeps dev, preview
     * and production identical and still refuses the false claim.
     */
    ...(!origin.includes("texasbarbering")
      ? {
          sameAs: [
            "https://www.linkedin.com/company/inner-g-complete-agency/",
            "https://www.instagram.com/shearquery/",
            "https://x.com/ShearQuery",
            "https://www.youtube.com/@shearquery",
            "https://www.tiktok.com/@shearquery",
          ],
        }
      : {}),
    founder: ref(AUTHOR_ID),
    description:
      opts?.description ??
      "Inner G Complete Agency operates ShearQuery, a directory and market-intelligence platform for the barber, beauty, and wellness industry.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Atlanta",
      addressRegion: "GA",
      addressCountry: "US",
    },
    knowsAbout: topics("barbering", "cosmetology", "esthetics", "nails"),
    areaServed: [
      { "@type": "State", name: "Texas", sameAs: [WIKIDATA.texas] },
      { "@type": "State", name: "California", sameAs: [WIKIDATA.california] },
      { "@type": "State", name: "Maryland", sameAs: [WIKIDATA.maryland] },
    ],
  };
}

/**
 * The site itself, with the search endpoint declared.
 *
 * `potentialAction` points at /tools/barbershop-search, which really does read
 * `?q=` — it is the live search this site runs, not an aspirational URL. A
 * SearchAction naming an endpoint that ignores the parameter is a broken
 * promise a consumer can and will test.
 */
export function websiteNode(opts?: { name?: string; alternateName?: string; origin?: string }) {
  const origin = opts?.origin ?? SITE_URL;
  return {
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: opts?.name ?? "ShearQuery",
    alternateName: opts?.alternateName ?? "ShearQuery by Inner G Complete Agency",
    url: origin,
    publisher: ref(`${origin}/#organization`),
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/tools/barbershop-search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * The author as a first-class graph node rather than an inline blob.
 *
 * Previously `authorSchema()` returned an anonymous Person, repeated in full on
 * every article. Twenty-two copies of an unidentified person is twenty-two
 * entities as far as a parser is concerned. With a fixed `@id` they collapse to
 * one, and every article's `author` becomes an edge to it.
 */
export function authorNode() {
  return {
    "@type": "Person",
    "@id": AUTHOR_ID,
    name: AUTHOR.name,
    jobTitle: AUTHOR.jobTitle,
    url: SITE_URL,
    image: `${SITE_URL}${AUTHOR.image}`,
    description: AUTHOR.description,
    sameAs: [AUTHOR.linkedin],
    worksFor: ref(ORG_ID),
    knowsAbout: topics("barbering", "cosmetology"),
  };
}

/* ------------------------------------------------------------------ *
 * Page-level helpers
 * ------------------------------------------------------------------ */

export interface WebPageInput {
  /** Canonical path, leading slash, no origin. */
  path: string;
  name: string;
  description?: string;
  /** The entity this document is about — pass its `@id`. */
  primaryEntityId?: string;
  breadcrumb?: boolean;
  /** ISO date the underlying facts were last checked or the row last changed. */
  dateModified?: string;
  type?: "WebPage" | "CollectionPage" | "ProfilePage" | "ItemPage" | "AboutPage";
  about?: unknown[];
}

/**
 * The WebPage node that ties a document to the site, the publisher and the
 * thing it describes.
 *
 * `ProfilePage` is the correct type for an entity profile and is worth using
 * rather than defaulting everything to WebPage — it states that the page is
 * about one specific person or organization, which is precisely what a
 * directory profile is.
 */
export function webPageNode(input: WebPageInput) {
  const node: Record<string, unknown> = {
    "@type": input.type ?? "WebPage",
    "@id": pageId(input.path),
    url: `${SITE_URL}${input.path}`,
    name: input.name,
    isPartOf: ref(WEBSITE_ID),
    publisher: ref(ORG_ID),
    inLanguage: "en-US",
  };
  if (input.description) node.description = input.description;
  if (input.primaryEntityId) node.mainEntity = ref(input.primaryEntityId);
  if (input.breadcrumb) node.breadcrumb = ref(breadcrumbId(input.path));
  if (input.dateModified) node.dateModified = input.dateModified;
  if (input.about && input.about.length > 0) node.about = input.about;
  return node;
}

/**
 * An editorial page — a guide, a licensing explainer, an exam breakdown —
 * assembled as a connected graph instead of a lone Article object.
 *
 * WHAT THIS FIXES. The guide pages each emitted a standalone Article with its
 * own `@context`: no publisher, no `isPartOf` the site, an author embedded by
 * value, and no `@id`. Every one of them was an island. That is a lot of
 * carefully sourced writing that a consumer could not attribute, place in the
 * site, or connect to the state and regulator it is about.
 *
 * `about` is passed as real nodes — the regulator, the state, the topics — so
 * "which pages explain Maryland cosmetology renewal" resolves through entities
 * rather than through the words in the headline.
 */
export function articleGraph(input: {
  path: string;
  headline: string;
  description: string;
  /** The hub this page belongs under, e.g. "/maryland". */
  parentPath?: string;
  parentName?: string;
  /** Regulator/state/topic nodes the page is about. Refs are fine. */
  about?: unknown[];
  /** The author node, embedded or referenced. */
  author?: object;
  citation?: unknown[];
  /** ISO date the underlying sources were last checked. */
  dateModified?: string;
  /** Extra nodes to define in the same document (regulators, ItemLists, FAQs). */
  extra?: (object | null | undefined | false)[];
  type?: "Article" | "TechArticle" | "HowTo";
}) {
  const article: Record<string, unknown> = {
    "@type": input.type ?? "Article",
    "@id": entityId(input.path),
    headline: input.headline,
    description: input.description,
    url: `${SITE_URL}${input.path}`,
    mainEntityOfPage: ref(pageId(input.path)),
    isPartOf: ref(WEBSITE_ID),
    publisher: ref(ORG_ID),
    inLanguage: "en-US",
  };
  if (input.author) article.author = input.author;
  if (input.about && input.about.length > 0) article.about = input.about;
  if (input.citation && input.citation.length > 0) article.citation = input.citation;
  // `dateModified` on a page whose facts are checked by hand is the honest
  // freshness signal: it is the date someone read the source, not the date a
  // build ran. A build-time stamp would claim freshness nothing verified.
  if (input.dateModified) article.dateModified = input.dateModified;

  const trail = [{ name: "Home", path: "" }];
  if (input.parentPath && input.parentName) {
    trail.push({ name: input.parentName, path: input.parentPath });
  }
  trail.push({ name: input.headline, path: input.path });

  return graph(
    {
      ...webPageNode({
        path: input.path,
        name: input.headline,
        description: input.description,
        primaryEntityId: entityId(input.path),
        breadcrumb: true,
        dateModified: input.dateModified,
      }),
      ...(input.about && input.about.length > 0 ? { about: input.about } : {}),
    },
    breadcrumbNode(input.path, trail),
    article,
    ...(input.extra ?? []),
  );
}

/**
 * The Q&A block, as its own node rather than as the page's type.
 *
 * WHY NOT JUST TYPE THE PAGE `FAQPage`. A directory profile is a ProfilePage —
 * a document about one specific business or person — and that is the more
 * useful statement of the two. But a node cannot be a ProfilePage whose
 * `mainEntity` is the business AND an FAQPage whose `mainEntity` is a list of
 * questions; `mainEntity` has one value and the two meanings conflict.
 *
 * So the FAQ becomes a sibling node with its own id, joined to the business by
 * `about` in one direction and `subjectOf` in the other. Nothing is lost: since
 * Google retired FAQ rich results in May 2026 this markup's remaining audience
 * is assistants reading the graph, and an explicit `about` edge tells them more
 * than a page type ever did.
 */
export function faqNode(
  path: string,
  entries: { q: string; a: string }[],
  aboutId?: string,
) {
  if (entries.length === 0) return null;
  const node: Record<string, unknown> = {
    "@type": "FAQPage",
    "@id": faqId(path),
    url: `${SITE_URL}${path}`,
    isPartOf: ref(WEBSITE_ID),
    mainEntity: entries.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  if (aboutId) node.about = ref(aboutId);
  return node;
}

/**
 * A BreadcrumbList with a stable `@id` so a WebPage can reference it instead of
 * embedding a second copy.
 */
export function breadcrumbNode(
  path: string,
  trail: { name: string; path: string }[],
) {
  return {
    "@type": "BreadcrumbList",
    "@id": breadcrumbId(path),
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: `${SITE_URL}${t.path}`,
    })),
  };
}

/* ------------------------------------------------------------------ *
 * Assembly
 * ------------------------------------------------------------------ */

/**
 * Wrap nodes into one `@graph` document.
 *
 * ONE script tag per page, not several. Separate <script> blocks are legal and
 * are what this site did, but they are separate documents — a `@id` reference
 * from one to another is a reference across documents, which consumers are
 * free to leave unresolved. Inside a single `@graph` the references are local
 * and unambiguous.
 *
 * Nulls are dropped so a caller can write `graph(a, cond ? b : null, c)`
 * without guarding every optional node at the call site.
 */
export function graph(...nodes: (object | null | undefined | false)[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}

/** Serialized for a <script type="application/ld+json"> tag. */
export function graphJson(...nodes: (object | null | undefined | false)[]) {
  return JSON.stringify(graph(...nodes));
}
