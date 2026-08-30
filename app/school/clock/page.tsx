import type { Metadata } from "next";
import { firstSchool } from "@/lib/school/store";
import { Kiosk } from "./kiosk";

/**
 * The clock, as it appears on a screen bolted by the door.
 *
 * NO NAVBAR, NO SIGN-IN, NO LINKS OUT. This is a fixed-purpose terminal in a
 * public corridor, not a page somebody browses. Site chrome on it is an
 * invitation for a student to wander into the rest of the app on a shared
 * device that never signs out.
 *
 * noindex for the same reason it has no chrome: it is furniture, not content.
 */
export const metadata: Metadata = {
  title: "Clock in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ClockPage() {
  const school = await firstSchool();

  return (
    <div className="light flex min-h-screen flex-col items-center justify-center bg-slate-100 px-6 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            {school?.name ?? "Clock in"}
          </h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-slate-400">
            Clock in &amp; out
          </p>
        </header>

        {school ? (
          <Kiosk />
        ) : (
          <p className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-center text-sm font-bold text-amber-900">
            No school is set up yet. Add one before mounting this on a wall.
          </p>
        )}
      </div>
    </div>
  );
}
