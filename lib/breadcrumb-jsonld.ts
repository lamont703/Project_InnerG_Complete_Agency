import { SITE_URL } from "./site";
// Shared BreadcrumbList builder for entity profile pages (barbers, shops,
// salons, stores, cosmetologists) — schools and events already had their
// own inline version; this closes the same gap for the remaining 5 types
// without duplicating the same three-line object shape five times.
export function buildEntityBreadcrumbJsonLd(sectionLabel: string, sectionPath: string, entityName: string, entitySlug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: sectionLabel, item: `${SITE_URL}${sectionPath}` },
      { "@type": "ListItem", position: 3, name: entityName, item: `${SITE_URL}${sectionPath}/${entitySlug}` },
    ],
  };
}
