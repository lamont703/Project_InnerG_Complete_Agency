import React from "react"

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
        "item": "https://agency.innergcomplete.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Insights",
        "item": "https://agency.innergcomplete.com/insights"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": title,
        "item": `https://agency.innergcomplete.com/insights/${slug}`
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
