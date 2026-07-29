/**
 * Which wordmark the site shows in its header and footer lockups.
 *
 *   "product" — ShearQuery, with "by Inner G Complete Agency" as fine print
 *   "agency"  — the original single-line Inner G Complete Agency lockup
 *
 * One constant rather than one per component, so the experiment reverts
 * everywhere in a single edit and the header and footer can't disagree about
 * what the site is called. Deliberately not an env var or feature flag: this is
 * a branding call someone should be able to undo without touching deploy
 * config.
 *
 * Note the footer's descriptive paragraph names the product either way — that
 * copy is load-bearing for Google's OAuth verification, which requires the
 * homepage to identify the app by the name on the consent screen. Reverting
 * this constant changes the lockups, not that sentence.
 */
export const LOGO_LOCKUP: "product" | "agency" = "product";
