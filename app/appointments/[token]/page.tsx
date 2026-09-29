import { Navbar } from "@/components/layout/navbar";
import { appointmentByToken, rulesFor } from "@/lib/calendar/client-booking";
import { formatLocal } from "@/lib/calendar/time";
import { clientMayChange, policyLines, money, type PaymentMode } from "@/lib/calendar/policy";
import { paymentSummary, paymentTerms, syncCheckoutSession } from "@/lib/calendar/payments";
import { CancelAppointmentButton } from "@/components/cancel-appointment-button";
import { RescheduleAppointment } from "@/components/reschedule-appointment";
import { PayNowButton, TipForm } from "@/components/appointment-payment-actions";

/**
 * The link in a client's confirmation text: see the appointment, pay for it if
 * it's being held, reschedule, cancel, or tip.
 * No login — the token is the credential, and the page reveals only what the
 * client's own text already said. noindex, and excluded in lib/public-routes.
 *
 * Stripe sends the client back here after paying (?paid=<session>) or tipping
 * (?tipped=<session>); the payment is read from Stripe before the page renders,
 * so it says "paid" without waiting on the webhook.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your appointment | ShearQuery",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ paid?: string; tipped?: string }> };

export default async function AppointmentPage({ params, searchParams }: Props) {
  const { token } = await params;
  const q = await searchParams;
  let found = await appointmentByToken(token);

  const returned = q.paid || q.tipped;
  if (found?.pro?.provider.stripe_account_id && returned && /^cs_[A-Za-z0-9_]+$/.test(returned)) {
    await syncCheckoutSession(returned, found.pro.provider.stripe_account_id).catch((e) => console.error("[appointment page] sync failed:", e?.message));
    found = await appointmentByToken(token);
  }

  let body: React.ReactNode;
  if (!found) {
    body = <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">That link isn&apos;t valid.</p>;
  } else {
    const a = found.appointment;
    const tz = found.pro?.provider.timezone || "America/Chicago";
    const who = found.pro ? `${found.pro.provider.display_name}${found.pro.listing ? ` at ${found.pro.listing}` : ""}` : "your pro";
    const pending = a.status === "pending_payment";
    const live = ["booked", "confirmed"].includes(a.status);
    const rules = await rulesFor(found.providerId, a);
    const minutesAway = (new Date(a.starts_at).getTime() - Date.now()) / 60_000;
    const canMove = live && clientMayChange(rules, "reschedule", minutesAway, a.reschedule_count ?? 0).ok;
    const canCancel = (live && clientMayChange(rules, "cancel", minutesAway).ok) || pending;
    // Rescheduling keeps the same service, matched by name on the pro's current menu.
    const service = found.pro?.services.find((x) => x.name.toLowerCase() === a.service_name.toLowerCase()) ?? null;
    const paid = await paymentSummary(a.id);
    const tipsOpen = found.pro ? (await paymentTerms(found.pro.provider)).tipsAvailable : false;
    const canTip = tipsOpen && (live || a.status === "completed");
    const mode = ((rules.payment_mode as PaymentMode) || "none");
    const statusLine =
      pending ? "Held for you — not booked until it's paid."
      : a.status === "cancelled" ? "Cancelled."
      : a.status === "completed" ? "Completed."
      : a.status === "no_show" ? "Marked as missed."
      : "You're booked.";

    body = (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-black">{a.service_name}</p>
        <p className="mt-1 text-sm text-slate-700">with {who}</p>
        <p className="mt-3 text-base font-bold">{formatLocal(new Date(a.starts_at), tz)}</p>
        <p className={`mt-1 text-sm ${pending ? "font-bold text-amber-800" : "text-slate-500"}`}>{statusLine}</p>

        {q.paid && a.payment_status === "paid" && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Payment received. We&apos;ve texted you the confirmation.</p>}
        {q.tipped && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Thank you — your tip goes straight to {found.pro?.provider.display_name ?? "them"}.</p>}

        {paid.paidCents > 0 && (
          <p className="mt-3 text-sm text-slate-700">
            Paid {money(paid.paidCents)}{paid.tipCents ? ` (including a ${money(paid.tipCents)} tip)` : ""}{paid.refundedCents ? ` · ${money(paid.refundedCents)} refunded` : ""}.
          </p>
        )}

        {pending && (
          <div className="mt-5 space-y-2">
            <PayNowButton token={token} label={`Pay ${money(a.amount_due_cents ?? 0)} to confirm`} />
            {a.hold_expires_at && <p className="text-xs text-slate-500">Held until {formatLocal(new Date(a.hold_expires_at), tz, false)}. After that the time is released.</p>}
          </div>
        )}

        {(canMove || canCancel) && (
          <div className="mt-5 space-y-4">
            {canMove && service && found.pro && (
              <RescheduleAppointment token={token} providerId={found.providerId} serviceId={service.id} timezone={tz} windowDays={found.pro.provider.booking_window_days} />
            )}
            {canCancel && <CancelAppointmentButton token={token} />}
          </div>
        )}
        {live && !canMove && !canCancel && (
          <p className="mt-5 text-sm text-slate-600">This can&apos;t be changed online now. Contact them directly.</p>
        )}

        {canTip && <div className="mt-6 border-t border-slate-100 pt-5"><TipForm token={token} priceCents={a.price_cents} /></div>}

        {(live || pending) && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Their booking policy</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-600">
              {policyLines(rules, mode, a.price_cents).map((l) => <li key={l}>{l}</li>)}
            </ul>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-lg px-5 pt-28 pb-20 sm:px-6">
        <h1 className="text-2xl font-black tracking-tight">Your appointment</h1>
        {body}
      </main>
    </div>
  );
}
