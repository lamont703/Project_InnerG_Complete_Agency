import { describe, it, expect } from "vitest";
import { SITE_URL } from "./site";
import { AUTHOR_NODE_ID, authorSchema } from "./author";
import {
  AUTHOR_ID,
  ORG_ID,
  WEBSITE_ID,
  CITY_WIKIDATA,
  WIKIDATA,
  REGULATORS,
  breadcrumbNode,
  cityNode,
  entityId,
  graph,
  identifiers,
  organizationNode,
  pageId,
  regulatorFor,
  stateNode,
  topics,
  webPageNode,
  websiteNode,
} from "./schema-graph";

/**
 * These tests exist because the failure mode of structured data is silent. A
 * wrong `@id`, a dangling reference or a duplicated node produces valid JSON,
 * renders fine, and is simply misread by every consumer forever. Nothing in the
 * build catches it, so it gets caught here.
 */

describe("node identity", () => {
  it("keeps the author id in sync across both files that mint it", () => {
    // lib/author.ts defines it and lib/schema-graph.ts re-exports it; they are
    // separate to avoid an import cycle, which is exactly how they could drift.
    expect(AUTHOR_ID).toBe(AUTHOR_NODE_ID);
    expect(authorSchema()["@id"]).toBe(AUTHOR_ID);
  });

  it("mints ids that are absolute and rooted at the canonical origin", () => {
    for (const id of [ORG_ID, WEBSITE_ID, AUTHOR_ID, entityId("/shop/x"), pageId("/shop/x")]) {
      expect(id.startsWith(`${SITE_URL}/`)).toBe(true);
    }
  });

  it("separates the document node from the entity node", () => {
    // Collapsing these is the mistake that makes an AggregateRating read as a
    // rating of the web page rather than of the business.
    expect(entityId("/shop/fades")).not.toBe(pageId("/shop/fades"));
  });

  it("gives different paths different ids", () => {
    expect(entityId("/shop/a")).not.toBe(entityId("/shop/b"));
  });
});

describe("external anchors", () => {
  it("points every Wikidata anchor at a real QID URL", () => {
    for (const [key, url] of Object.entries({ ...WIKIDATA, ...CITY_WIKIDATA })) {
      expect(url, key).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/);
    }
  });

  it("does not reuse one QID for two different concepts", () => {
    const all = [...Object.values(WIKIDATA), ...Object.values(CITY_WIKIDATA)];
    expect(new Set(all).size).toBe(all.length);
  });

  it("resolves a state we cover and refuses one we do not", () => {
    expect(stateNode("TX")).toMatchObject({ name: "Texas", sameAs: [WIKIDATA.texas] });
    // Guessing here would assert a false identity, so the contract is null.
    expect(stateNode("NY")).toBeNull();
    expect(stateNode(null)).toBeNull();
  });

  it("nests a city inside its state, anchored when known", () => {
    const houston = cityNode("Houston", "TX") as Record<string, unknown>;
    expect(houston.sameAs).toEqual([CITY_WIKIDATA.houston]);
    expect(houston.containedInPlace).toMatchObject({ name: "Texas" });
  });

  it("still builds the containment edge for a city with no anchor", () => {
    const node = cityNode("Pflugerville", "TX") as Record<string, unknown>;
    expect(node.sameAs).toBeUndefined();
    expect(node.containedInPlace).toMatchObject({ name: "Texas" });
  });

  it("matches city names case- and whitespace-insensitively", () => {
    expect((cityNode("  SAN ANTONIO ", "TX") as Record<string, unknown>).sameAs)
      .toEqual([CITY_WIKIDATA["san antonio"]]);
  });

  it("strips a ZIP glued onto the city name", () => {
    // 556 barbershop rows store the city as "Houston 77069". Left alone this
    // published a City whose name is not a city AND missed the Wikidata anchor
    // for the largest city on the site, because the map is keyed on the name.
    const node = cityNode("Houston 77069", "TX") as Record<string, unknown>;
    expect(node.name).toBe("Houston");
    expect(node.sameAs).toEqual([CITY_WIKIDATA.houston]);
  });

  it("returns null when the city is nothing but a ZIP", () => {
    expect(cityNode("77069", "TX")).toBeNull();
  });
});

describe("identifiers", () => {
  it("never emits an identifier without the registry it belongs to", () => {
    // A bare number is unverifiable; that is the whole point of propertyID.
    expect(identifiers({ licenseNumber: "12345" })).toBeUndefined();
  });

  it("omits the array entirely when there is nothing to identify", () => {
    // An empty or null-bearing `identifier` asserts an identity resolving to
    // nothing, which is worse than staying silent.
    expect(identifiers({ licenseNumber: null, googlePlaceId: null })).toBeUndefined();
  });

  it("labels each identifier with its registry", () => {
    const out = identifiers({
      licenseNumber: "9001",
      licenseAuthority: "TDLR",
      googlePlaceId: "ChIJabc",
    })!;
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ "@type": "PropertyValue", propertyID: "TDLR License Number", value: "9001" });
    expect(out[1].propertyID).toBe("Google Place ID");
  });
});

describe("topics", () => {
  it("emits resolvable Thing nodes rather than bare strings", () => {
    const [t] = topics("barbering");
    expect(t["@type"]).toBe("Thing");
    expect(t.sameAs[0]).toMatch(/wikidata\.org/);
  });
});

describe("regulators", () => {
  it("gives each state's regulator one shared id", () => {
    expect(regulatorFor("tx")).toBe(REGULATORS.tx);
    expect(regulatorFor("MD")).toBe(REGULATORS.md);
    expect(regulatorFor("NY")).toBeNull();
  });

  it("gives every regulator a stable @id so pages reference one entity", () => {
    const ids = Object.values(REGULATORS).map((r) => r["@id"]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^https:\/\/.+#organization$/);
  });
});

describe("graph assembly", () => {
  it("drops nullish nodes so callers can inline conditionals", () => {
    const g = graph({ a: 1 }, null, undefined, false, { b: 2 });
    expect(g["@graph"]).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("declares the context once for the whole document", () => {
    expect(graph({})["@context"]).toBe("https://schema.org");
  });

  it("leaves no dangling references in a fully assembled page graph", () => {
    // The invariant that matters: every `@id` referenced by an edge is either
    // defined in this document or is an absolute external URL. A reference to
    // a node nobody defines is the silent failure this whole file guards.
    const g = graph(
      organizationNode(),
      websiteNode(),
      webPageNode({
        path: "/shop/fades",
        name: "Fades",
        primaryEntityId: entityId("/shop/fades"),
        breadcrumb: true,
      }),
      breadcrumbNode("/shop/fades", [
        { name: "Home", path: "" },
        { name: "Barbershops", path: "/shop" },
      ]),
      { "@type": "LocalBusiness", "@id": entityId("/shop/fades"), name: "Fades" },
      { "@type": "BreadcrumbList", "@id": `${SITE_URL}/shop/fades#breadcrumb` },
    );

    const defined = new Set<string>();
    const referenced = new Set<string>();
    const walk = (v: unknown, isRefSite: boolean) => {
      if (Array.isArray(v)) return v.forEach((x) => walk(x, isRefSite));
      if (!v || typeof v !== "object") return;
      const o = v as Record<string, unknown>;
      const id = typeof o["@id"] === "string" ? (o["@id"] as string) : null;
      if (id) {
        // A node carrying only `@id` is a reference; anything else defines it.
        if (Object.keys(o).length === 1) referenced.add(id);
        else defined.add(id);
      }
      for (const val of Object.values(o)) walk(val, isRefSite);
    };
    walk(g["@graph"], false);

    for (const r of referenced) {
      expect(defined.has(r) || /^https?:\/\//.test(r), `dangling reference: ${r}`).toBe(true);
    }
    expect(referenced.size).toBeGreaterThan(0);
  });
});

describe("singleton nodes", () => {
  it("points the website's search action at an endpoint that reads the param", () => {
    // /tools/barbershop-search really does read `?q=`. A SearchAction naming an
    // endpoint that ignores its parameter is a promise a consumer will test.
    const target = (websiteNode().potentialAction.target as { urlTemplate: string }).urlTemplate;
    expect(target).toContain("/tools/barbershop-search?q={search_term_string}");
  });

  it("ties the organization and the author together in both directions", () => {
    expect(organizationNode().founder).toEqual({ "@id": AUTHOR_ID });
  });

  it("gives the organization a resolvable subject scope", () => {
    const k = organizationNode().knowsAbout;
    expect(k.length).toBeGreaterThan(0);
    for (const t of k) expect(t.sameAs[0]).toMatch(/wikidata\.org/);
  });
});

describe("webPageNode", () => {
  it("connects every page to the site and the publisher", () => {
    const p = webPageNode({ path: "/x", name: "X" });
    expect(p.isPartOf).toEqual({ "@id": WEBSITE_ID });
    expect(p.publisher).toEqual({ "@id": ORG_ID });
  });

  it("omits optional edges rather than emitting empty ones", () => {
    const p = webPageNode({ path: "/x", name: "X", about: [] });
    expect(p.mainEntity).toBeUndefined();
    expect(p.breadcrumb).toBeUndefined();
    expect(p.about).toBeUndefined();
  });
});
