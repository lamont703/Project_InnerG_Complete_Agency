import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { AlertTriangle } from "lucide-react";
import { ConversationsView } from "@/components/conversations/conversations-view";

/**
 * PROTOTYPE. The unified SMS + email inbox, with nothing behind it.
 *
 * No Mailgun key, no Twilio call, no table. The composer appends to React state
 * and the message sits at "Queued" forever, because a prototype that renders a
 * green "Delivered" it did not earn teaches the wrong thing in the one place
 * this screen has to be trusted.
 *
 * GATED TWICE, AND THE SECOND ONE IS THE REAL BOUNDARY. /admin/conversations is
 * in middleware's INTERNAL_TOOL_ROUTES, which is the Internal Tools password —
 * but that middleware FAILS OPEN on an auth exception, so this page re-checks
 * isAdmin() and 404s rather than rendering. Same reasoning as
 * /admin/credit-report: the names, phone numbers and email addresses on screen
 * are invented, and they look exactly like a real customer inbox. A screenshot
 * of this page out of context is indistinguishable from a leak.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conversations (Prototype) | Inner G Complete",
  robots: { index: false, follow: false },
};

export default async function ConversationsPage() {
  if (!(await isAdmin())) notFound();

  return (
    <div className="light min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="mb-4 flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-bold">Prototype — nothing on this page sends, and nobody named is real.</p>
            <p className="mt-1">
              There is no Mailgun key and no Twilio call behind this screen. Sending appends the
              message to the thread and leaves it at <span className="font-semibold">Queued</span>,
              which is what an unwired composer honestly produces. Every contact, phone number and
              message is invented. This exists to settle the interface before the providers go in.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Conversations</h1>
          <p className="mt-1 text-sm text-slate-600">
            One thread per contact, both channels in it. SMS through Twilio, email through Mailgun.
          </p>
        </div>

        <ConversationsView />
      </main>
    </div>
  );
}
