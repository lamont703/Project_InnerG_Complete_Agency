import { SITE_URL } from "./site";
import { breadcrumbNode } from "./schema-graph";

/**
 * Shared BreadcrumbList builder for entity profile pages (barbers, shops,
 * salons, stores, cosmetologists) — schools and events already had their
 * own inline version; this closes the same gap for the remaining 5 types
 * without duplicating the same three-line object shape five times.
 *
 * NOW RETURNS A GRAPH NODE, not a standalone document. It used to carry its own
 * `@context` and ship in a separate <script> tag, which meant the WebPage node
 * on the same page had no way to reference it — a breadcrumb sitting in a
 * different JSON-LD document is a breadcrumb for nobody. It has an `@id` and no
 * `@context` so it can be dropped straight into the page's `@graph()` and
 * pointed at by `breadcrumb: ref(breadcrumbId(path))`.
 */
export function buildEntityBreadcrumbJsonLd(
  sectionLabel: string,
  sectionPath: string,
  entityName: string,
  entitySlug: string,
) {
  return breadcrumbNode(`${sectionPath}/${entitySlug}`, [
    { name: "Home", path: "" },
    { name: sectionLabel, path: sectionPath },
    { name: entityName, path: `${sectionPath}/${entitySlug}` },
  ]);
}

/**
 * The pre-graph shape, for any caller still emitting a standalone <script>.
 * Kept so a page that has not been migrated yet does not silently lose its
 * `@context` and become an untyped blob.
 */
export function buildStandaloneBreadcrumbJsonLd(
  sectionLabel: string,
  sectionPath: string,
  entityName: string,
  entitySlug: string,
) {
  return {
    "@context": "https://schema.org",
    ...buildEntityBreadcrumbJsonLd(sectionLabel, sectionPath, entityName, entitySlug),
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: sectionLabel, item: `${SITE_URL}${sectionPath}` },
      { "@type": "ListItem", position: 3, name: entityName, item: `${SITE_URL}${sectionPath}/${entitySlug}` },
    ],
  };
}
