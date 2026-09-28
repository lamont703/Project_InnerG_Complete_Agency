/**
 * Who may use the ShearQuery calendar while it is in private testing.
 *
 * Its own list, not ADMIN_EMAILS and not the Instagram list: widening this to a
 * few test barbers must neither make them admins nor hand them Instagram.
 * CALENDAR_OPEN=true opens it to every member — only after it has been tested.
 *
 * Plain data, no server imports, so pages and tools share one answer.
 */

export const CALENDAR_ALLOWLIST = ["lamont703@gmail.com"];

export function canUseCalendar(email?: string | null): boolean {
  if (process.env.CALENDAR_OPEN === "true") return true;
  return !!email && CALENDAR_ALLOWLIST.includes(email.trim().toLowerCase());
}

export const CALENDAR_NOT_AVAILABLE =
  "The ShearQuery calendar is in private testing and isn't available on this account yet.";
