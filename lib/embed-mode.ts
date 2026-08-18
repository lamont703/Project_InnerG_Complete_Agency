/**
 * `?embed=1` — this page is being shown inside the AI Mode side panel.
 *
 * WHY IT HAS TO EXIST. The panel renders a real page in a same-origin iframe.
 * Without a signal, that page brings its own navbar into a 500px column
 * directly beneath the navbar the user is already looking at, plus the floating
 * scroll CTA, which then sits on top of the chat. The reader sees the site
 * twice and cannot tell which chrome belongs to which thing.
 *
 * A QUERY PARAM RATHER THAN A HEADER, because the value has to survive being
 * typed into an iframe `src` and read by client components that already call
 * useSearchParams. A header would need middleware plus a context provider to
 * reach the same place.
 *
 * ONLY CHROME IS SUPPRESSED, never content. The panel exists so someone can
 * READ the page — an embed mode that also trimmed the page body would defeat
 * the feature and quietly make the panel lie about what is on the URL.
 *
 * Pure and dependency-free so both server and client components can call it.
 */

export const EMBED_PARAM = "embed";

/** True when a page is rendering inside the panel. */
export function isEmbedded(params: { get(name: string): string | null } | null | undefined): boolean {
  return params?.get(EMBED_PARAM) === "1";
}

/**
 * Add the flag to an internal path.
 *
 * Refuses anything that is not a same-origin relative path. The panel must
 * never frame an external site: we cannot suppress someone else's chrome, they
 * may set frame-ancestors and render a blank box, and framing a third party
 * inside our own UI implies an endorsement we have not made. External links
 * keep their existing target="_blank" behaviour.
 */
export function embedHref(path: string): string | null {
  const p = String(path || "").trim();
  if (!p.startsWith("/") || p.startsWith("//")) return null;
  const [base, hash] = p.split("#");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${EMBED_PARAM}=1${hash ? `#${hash}` : ""}`;
}
