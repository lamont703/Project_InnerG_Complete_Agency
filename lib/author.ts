/**
 * One author identity, used everywhere.
 *
 * WHY THIS EXISTS. The same person carried three different job titles across
 * the site and LinkedIn — "Senior Product Owner | Machine Learning/Full Stack
 * Engineer" on the LinkedIn headline, "Principal AI Architect & Founder" in the
 * article byline, and "Principal Architect" in the Organization schema in
 * app/layout.tsx. Three strings for one person weakens entity resolution
 * everywhere it matters: Google's understanding of who wrote the research, and
 * an assistant's ability to connect the site to a real person.
 *
 * Anything rendering the author's name, title or profile link imports from
 * here. Changing the title in one place changes it in the markup, the visible
 * byline and the structured data at once.
 */
import { SITE_URL } from "./site";

export const AUTHOR = {
  name: "Lamont Evans",
  /**
   * Matches the LinkedIn headline exactly. If the headline changes, change it
   * here in the same sitting — the whole point is that these agree.
   */
  jobTitle: "Senior Product Owner | Machine Learning Engineer",
  linkedin: "https://www.linkedin.com/in/lamont-evans-57ab4922a/",
  url: SITE_URL,
  image: "/avatars/lamont.webp",
  description:
    "Lamont Evans is a certified CPMAI (Cognitive Project Management for AI) professional specialized in architecting sovereign intelligence layers for the wellness and grooming sectors. He focuses on the intersection of agentic workflows and proprietary domain-specific models, ensuring every deployment is institutionally auditable and built for long-term ownership.",
} as const;

/**
 * The author as a schema.org Person, for embedding in Article / HowTo / any
 * CreativeWork node.
 *
 * `sameAs` is the load-bearing field. It is what tells Google and any model
 * reading the .md layer that the byline on this research and that LinkedIn
 * profile are the same entity — which is the entire mechanism by which
 * expertise on the site accrues to a person rather than to an anonymous domain.
 */
export function authorSchema() {
  return {
    "@type": "Person",
    name: AUTHOR.name,
    jobTitle: AUTHOR.jobTitle,
    url: AUTHOR.url,
    sameAs: [AUTHOR.linkedin],
  };
}
