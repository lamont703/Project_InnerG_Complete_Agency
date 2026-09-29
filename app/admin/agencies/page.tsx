import { notFound } from "next/navigation";
import { Briefcase } from "lucide-react";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { listAgencies } from "@/lib/agency";
import { AgencyDemoButton } from "@/components/admin/agency-demo-button";

/**
 * Agencies that have signed up, and one click to set up each one's demo shop.
 * Replaces running scripts/seed_demo_calendar.mts by hand. Admin-checked here
 * because middleware fails open on an auth exception.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Agencies | Admin", robots: { index: false, follow: false } };

export default async function AgenciesAdminPage() {
  if (!(await isAdmin())) notFound();
  const rows = await listAgencies();
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 pt-28 pb-20 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-black"><Briefcase className="h-6 w-6" /> Agencies</h1>
        <p className="mt-2 text-sm text-slate-600">Agencies that signed up and told us about themselves. Setting up a demo gives them calendar access and a demo shop full of made-up data — it never touches a real calendar.</p>
        {rows.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No agencies yet.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {rows.map((r) => (
              <div key={r.memberId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black">{r.agency_name}</p>
                    <p className="text-xs text-slate-500">{r.name} · {r.email}{r.website ? ` · ${r.website}` : ""}</p>
                  </div>
                  <AgencyDemoButton memberId={r.memberId} ready={!!r.demo_ready_at || r.hasDemo} />
                </div>
                <p className="mt-3 text-sm text-slate-700">{r.what_they_build || "—"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {r.client_count != null ? `${r.client_count} clients` : "clients not said"} · {r.markets || "markets not said"} · joined {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
