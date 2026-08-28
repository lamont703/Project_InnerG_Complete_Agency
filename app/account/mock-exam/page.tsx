import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Navbar } from "@/components/layout/navbar";
import { membershipPath } from "@/lib/audiences";
import { currentMember } from "@/lib/member-context";
import { MockExamConsole } from "@/features/student/components/MockExamConsole";

/**
 * The Texas Class A Barber mock exam, on a member's own account.
 *
 * Lifted out of /dashboard/[slug]/mock-exam, which is a per-user portal
 * provisioned by /api/barber/register — the model being retired. The console
 * itself is shared; that route still exists and still passes its slug.
 *
 * LIGHT THEME AND THE SITE HEADER, matching /account/exam-prep.
 *
 * The console is shared with the dashboard, which is dark, so neither theme
 * can be baked into it. `.light` in globals.css redefines --background,
 * --foreground and the rest of the token set, and every colour in the console
 * is written against those tokens (bg-background, text-muted-foreground) —
 * so wrapping is the whole fix and the dashboard is untouched.
 *
 * THE WRAPPER CARRIES bg-background ITSELF, and that is not decoration. The
 * console's shells are `max-w-5xl mx-auto` / `max-w-6xl mx-auto`, so their
 * light background is a centred COLUMN. Everything either side of it is
 * <body>, which globals.css paints with `@apply bg-background` — and body sits
 * OUTSIDE this `.light` element, so it resolves against :root's dark token.
 * The result was a light exam in black gutters.
 *
 * It uses the same `bg-background` token the console uses rather than a
 * near-match like bg-slate-50, because "nearly the same colour" is what makes
 * two panels look like two panels. Same token, same value, one screen.
 *
 * The header is passed as a slot rather than rendered here, because the
 * console has to place it inside each of its own full-screen shells and add
 * the padding that clears it. Navbar is `fixed top-0`, so it occupies no
 * layout height and content would otherwise start underneath it.
 *
 * ONE SCREEN DELIBERATELY HAS NO HEADER: the running simulation. That is a
 * 90-minute timed exam in its own two-pane, overflow-hidden layout, and a
 * fixed site nav across the top of it both compresses the layout and puts
 * "leave this page" one stray tap from a candidate mid-exam. Briefing,
 * loading and results all carry it.
 *
 * NO PROJECT IS PASSED, which is the whole point: mock_exams.project_id has
 * been nullable since migration 165, so an exam that belongs to a person
 * rather than a portal is a row the schema always allowed.
 */
export const metadata: Metadata = {
  title: "Texas Class A Barber Mock Exam",
  // Per-member state. /account is excluded from the sitemap and the .md layer
  // in lib/public-routes.ts, and noindex'd in app/account/layout.tsx.
  robots: { index: false, follow: false },
};

// Per-member data — never statically rendered or cached between people.
export const dynamic = "force-dynamic";

export default async function AccountMockExamPage() {
  const member = await currentMember();
  // Same stance as the rest of /account: not signed in is the signup funnel,
  // not an error.
  if (!member) redirect(membershipPath("student"));

  return (
    <div className="light bg-background min-h-screen">
      <MockExamConsole siteHeader={<Navbar />} />
    </div>
  );
}
