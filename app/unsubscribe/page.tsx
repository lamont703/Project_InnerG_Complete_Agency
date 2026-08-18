import { verifyUnsubscribeToken } from "@/lib/outreach-suppression";
import { UnsubscribeButton } from "./unsubscribe-button";

/**
 * Where the opt-out link in every outreach email lands.
 *
 * ONE PAGE, ONE CLICK. CAN-SPAM says we may not make someone do anything beyond
 * "visiting a single page on an Internet website" to opt out — no login, no
 * form, no preference centre asking them to reconsider. This is that page.
 *
 * WHY A BUTTON RATHER THAN UNSUBSCRIBING ON LOAD. Mail clients and security
 * scanners prefetch links in messages, so a GET with a side effect would
 * silently unsubscribe people who never clicked anything and leave us unable to
 * tell a real opt-out from a scanner. One deliberate click keeps the record
 * meaningful, and it is still a single page.
 *
 * A BAD TOKEN IS NOT AN ERROR PAGE. Someone who wants out and hits a wall is
 * exactly who reports the message as spam, so a token we cannot read still
 * offers a route: reply with "unsubscribe" and a human handles it.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Unsubscribe · ShearQuery",
  // Never index an opt-out page; it exists for one recipient, not for search.
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  let email: string | null = null;
  try {
    email = t ? verifyUnsubscribeToken(t) : null;
  } catch {
    // Missing signing secret. Same outcome as a bad token: offer the reply
    // route rather than telling the reader about our configuration.
    email = null;
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-black text-slate-900">Unsubscribe</h1>

      {email ? (
        <>
          <p className="mt-3 text-sm text-slate-600">
            We&apos;ll stop sending email to <strong className="text-slate-900">{email}</strong>.
          </p>
          <UnsubscribeButton token={t!} email={email} />
          <p className="mt-6 text-xs text-slate-500">
            This only stops outreach email. It doesn&apos;t remove your school&apos;s listing — that
            information comes from public sources and Google Business Profile.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm text-slate-600">
            This link is missing or has been altered, so we can&apos;t tell which address to remove.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Reply to the email you received with the word <strong>unsubscribe</strong> and
            we&apos;ll take that address off the list within 10 business days.
          </p>
        </>
      )}
    </main>
  );
}
