import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { listSessions, fetchSession, signShots } from "@/lib/hairstyle/store";
import { HairstyleSelector } from "@/components/admin/hairstyle-selector";
import { StartSession } from "./start-session";
import { Fade3DView } from "@/components/admin/fade-3d-view";
import { Scissors } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "HairStyle Selector | ShearQuery",
  robots: { index: false, follow: false },
};

/**
 * A client showing a barber what they want.
 *
 * NOT A TRY-ON. The problem worth solving is not "what would that look like on
 * me" — it is the gap between what a client asks for and what the barber hears.
 * "Number two on the sides" means different things to different people, and the
 * cost of the mismatch is a bad cut. So the artifact this produces is
 * INSTRUCTIONS, with the photos as supporting evidence.
 *
 * Five angles because lib/fade-geometry infers the back and crown of the skull
 * from a front-facing mesh and says so in as many words — and the fade line
 * lives exactly where that inference is weakest.
 *
 * INTERNAL FIRST, ON PURPOSE. Gated by middleware plus isAdmin() here, so the
 * barber can run it on himself before anyone else sees it. The photos are the
 * reason for the gate: five angles of a named person's head, in the only
 * private storage bucket this project has.
 */
export default async function HairstyleSelectorPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  if (!(await isAdmin())) notFound();

  const { session: sessionId } = await searchParams;
  const active = sessionId ? await fetchSession(sessionId) : null;
  const signed = active ? await signShots(active.shots) : {};
  const recent = await listSessions(8);

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-100 rounded-full px-3 py-1 mb-3">
          <Scissors className="w-3 h-3" />
          Internal · HairStyle Selector
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          {active ? active.subjectName || "This session" : "Show your barber what you want"}
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          Five angles of your head, a style picked from real fade parameters, and instructions your
          barber can follow — or push back on — before the clippers start.
        </p>

        {active ? (
          <HairstyleSelector
            sessionId={active.id}
            initialShots={signed}
            initialSpec={active.fadeSpec}
            initialRequest={active.request}
          />
        ) : (
          <StartSession />
        )}

        {!active && (
          <div className="mt-8">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
              The fade in 3D
            </h2>
            <Fade3DView />
          </div>
        )}

        {active && active.fadeSpec && (
          <div className="mt-8">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
              This fade, from the back
            </h2>
            <Fade3DView initialSpec={active.fadeSpec} />
          </div>
        )}

        {!active && recent.length > 0 && (
          <div className="mt-8">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
              Recent sessions
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {recent.map((s) => (
                <a
                  key={s.id}
                  href={`/admin/hairstyle-selector?session=${s.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                >
                  <span className="font-bold text-slate-900 text-[14px] flex-1">
                    {s.subjectName || "Untitled"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {Object.keys(s.shots).length}/5 shots
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {s.status}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {active?.status === "sent" && (
          <p className="mt-4 text-[12px] text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-3.5 py-2.5">
            Marked as sent. Nothing was actually texted — while this is an internal demo the barber
            and the client are the same person. The send path is the same GHL outbound the rebooking
            agent uses, and gets wired in when there is somebody else to send to.
          </p>
        )}
      </div>
    </div>
  );
}
