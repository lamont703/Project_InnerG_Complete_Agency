import { notFound } from "next/navigation";
import { findByToken } from "@/lib/sms-consent/store";
import { ConsentForm } from "@/components/sms-consent-form";
import { CONSENT_TEXT, BUSINESS_NAME } from "@/lib/sms-consent/disclosure";
import { OFFER_PERCENT } from "@/lib/offers/haircut-offer";

export const dynamic = "force-dynamic";

/**
 * The consent page a client lands on from the email.
 *
 * NOINDEX, and not because it is secret — the URL carries a token tied to one
 * person, and a search engine indexing it would put a working consent link for
 * a named client into a public index.
 */
export const metadata = {
  title: `Text reminders | ${BUSINESS_NAME}`,
  robots: { index: false, follow: false },
};

export default async function SmsConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await findByToken(token);
  if (!record) notFound();

  const alreadyDone = record.status === "confirmed" || record.status === "synced";
  const firstName = (record.clientName ?? "").trim().split(/\s+/)[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 light flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
            {BUSINESS_NAME}
          </p>

          {alreadyDone ? (
            <>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 mb-2">
                You&apos;re all set{firstName ? `, ${firstName}` : ""}
              </h1>
              <p className="text-[14px] text-slate-600">
                You&apos;ll get a text when you&apos;re due for your next cut. Reply STOP to any
                message to turn them off.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 mb-2">
                Want a text when you&apos;re due{firstName ? `, ${firstName}` : ""}?
              </h1>
              <p className="text-[14px] text-slate-600 mb-4">
                Easier than remembering. I&apos;ll send a quick message when it&apos;s about time
                for your next cut — nothing else.
              </p>
              <p className="text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 mb-5">
                <strong>{OFFER_PERCENT}% off your next cut</strong> once you confirm — I&apos;ll text
                you the code. It&apos;s good for 10 days.
              </p>
              <ConsentForm token={token} consentText={CONSENT_TEXT} />
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-4">
          Message and data rates may apply. Reply STOP to opt out, HELP for help.
        </p>
      </div>
    </div>
  );
}
