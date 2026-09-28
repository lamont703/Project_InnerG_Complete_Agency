import { Navbar } from "@/components/layout/navbar";
import { appointmentByToken, CLIENT_LIMITS } from "@/lib/calendar/client-booking";
import { formatLocal } from "@/lib/calendar/time";
import { CancelAppointmentButton } from "@/components/cancel-appointment-button";

/**
 * The link in a client's confirmation text: see the appointment, cancel it.
 * No login — the token is the credential, and the page reveals only what the
 * client's own text already said. noindex, and excluded in lib/public-routes.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your appointment | ShearQuery",
  robots: { index: false, follow: false },
};

export default async function AppointmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await appointmentByToken(token);

  let body: React.ReactNode;
  if (!found) {
    body = <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900">That link isn&apos;t valid.</p>;
  } else {
    const a = found.appointment;
    const tz = found.pro?.provider.timezone || "America/Chicago";
    const who = found.pro ? `${found.pro.provider.display_name}${found.pro.listing ? ` at ${found.pro.listing}` : ""}` : "your pro";
    const live = ["booked", "confirmed"].includes(a.status);
    const cancellable = live && new Date(a.starts_at).getTime() - Date.now() > CLIENT_LIMITS.cancelCutoffMinutes * 60_000;
    body = (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-black">{a.service_name}</p>
        <p className="mt-1 text-sm text-slate-700">with {who}</p>
        <p className="mt-3 text-base font-bold">{formatLocal(new Date(a.starts_at), tz)}</p>
        <p className="mt-1 text-sm text-slate-500">
          {a.status === "cancelled" ? "Cancelled." : a.status === "completed" ? "Completed." : a.status === "no_show" ? "Marked as missed." : "You're booked."}
        </p>
        {cancellable ? (
          <div className="mt-5"><CancelAppointmentButton token={token} /></div>
        ) : live ? (
          <p className="mt-5 text-sm text-slate-600">
            It&apos;s less than {CLIENT_LIMITS.cancelCutoffMinutes / 60} hours away, so it can&apos;t be cancelled here. Contact them directly.
          </p>
        ) : null}
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
