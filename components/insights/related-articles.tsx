import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { insightsArticles } from "@/lib/insights-articles"

interface RelatedArticlesProps {
  currentSlug: string;
}

// Category-driven, not hand-picked — the manual in-content cross-links
// already built into most articles are real and valuable, but they only
// cover pairs someone thought to connect. This catches everything else in
// the same category systematically, so no article in a cluster is an
// orphan just because nobody wrote a sentence linking to it.
export function RelatedArticles({ currentSlug }: RelatedArticlesProps) {
  const current = insightsArticles.find((a) => a.slug === currentSlug);
  if (!current) return null;

  const related = insightsArticles
    .filter((a) => a.slug !== currentSlug && a.category === current.category)
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <div className="pt-16 border-t border-border">
      <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground mb-8">
        Related in {current.category}
      </h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {related.map((article) => (
          <Link
            key={article.slug}
            href={`/insights/${article.slug}`}
            className="group rounded-2xl border border-border bg-white p-5 hover:border-primary/40 transition-colors"
          >
            <h3 className="text-sm font-black text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">
              {article.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{article.excerpt}</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-wider">
              Read More
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
