import React from "react"
import { SITE_URL } from "@/lib/site";

interface BreadcrumbSchemaProps {
  slug: string
  title: string
}

export function BreadcrumbSchema({ slug, title }: BreadcrumbSchemaProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": SITE_URL
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Insights",
        "item": `${SITE_URL}/insights`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": title,
        "item": `${SITE_URL}/insights/${slug}`
      }
    ]
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
