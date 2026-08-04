import { Linkedin, ShieldCheck } from "lucide-react";
import { AUTHOR } from "@/lib/author";

/**
 * A one-line byline for reference pages.
 *
 * WHY NOT REUSE AuthorBio. That component is a 96px portrait, a paragraph of
 * biography and a row of links — right for a 2,000-word essay in /insights,
 * wrong at the top of a licensing table someone opened to check a fee. Dropping
 * it onto 30-odd reference pages would put more author than answer above the
 * fold.
 *
 * This carries the same three things that actually matter — who verified it,
 * a link to them, and when it was last checked — in a single line. The
 * verification date is the part a reader of a regulatory page cares about most,
 * so it sits in the byline rather than buried in a footer.
 */
export function ResearchByline({
  verifiedOn,
  what = "Researched and verified",
}: {
  /** ISO date the sources behind this page were last read. */
  verifiedOn: string;
  /** Override where "verified" is the wrong verb for the page. */
  what?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 border-y border-slate-200 py-3 text-xs text-slate-500">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
      <span className="font-semibold text-slate-600">{what} by</span>
      <a
        href={AUTHOR.linkedin}
        target="_blank"
        rel="noopener noreferrer me"
        className="inline-flex items-center gap-1 font-black text-slate-900 hover:text-indigo-700 hover:underline"
      >
        {AUTHOR.name}
        <Linkedin className="h-3 w-3" />
      </a>
      <span className="text-slate-400">&middot;</span>
      <span className="font-medium">{AUTHOR.jobTitle}</span>
      <span className="text-slate-400">&middot;</span>
      <span className="font-medium">
        sources last read <time dateTime={verifiedOn}>{verifiedOn}</time>
      </span>
    </div>
  );
}
