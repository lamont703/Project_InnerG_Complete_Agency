import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
 * NO NAVBAR, unlike every other /account page. This is a timed 100-question
 * simulation and the console owns a full-screen shell on purpose. Site chrome
 * around an exam is the wrong call, and the console's own exit button already
 * leads back to /account/exam-prep when there is no project.
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

  return <MockExamConsole />;
}
