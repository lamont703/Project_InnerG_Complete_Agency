/**
 * The one place that decides who counts as an agency admin.
 *
 * Deliberately a hardcoded list rather than a roles table — same posture as the
 * internal-tools screensaver in middleware.ts, which now sources its allowed
 * email from here so the two can't drift apart. When a real
 * roles/permissions system lands, this module is the only thing to replace.
 *
 * Emails are compared lowercased and trimmed. This module is plain data with no
 * server-only imports, so client components can use it to decide whether to
 * *show* an admin control — but showing is all a client check is ever good for.
 * Anything that grants access must verify a real server-side session email
 * against this list.
 */
export const ADMIN_EMAILS = ["lamont703@gmail.com"] as const;

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return (ADMIN_EMAILS as readonly string[]).includes(email.trim().toLowerCase());
}
