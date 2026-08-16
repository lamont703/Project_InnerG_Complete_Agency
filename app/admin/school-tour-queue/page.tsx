import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { fetchTourQueue } from "@/lib/admin/school-tour-queue";
import { SchoolTourQueue } from "@/components/admin/school-tour-queue";
import { PhoneCall } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "School Tour Call Queue | Inner G Complete",
  robots: { index: false, follow: false },
};

/**
 * Staff queue for school tour requests.
 *
 * WHY THIS IS STAFFED AND NOT AUTOMATED. Every other entity type gets an SMS
 * when a request arrives. Schools cannot: we hold four email addresses across
 * 1,185 schools, and phone is on 98.1%. So a person calls — and that call is
 * the only conversation we get with a school that has never claimed its
 * listing, which is why the two sales questions are printed on every row.
 *
 * Gated by middleware (INTERNAL_TOOL_ROUTES) plus the isAdmin() guard here,
 * because middleware fails OPEN on an auth exception and this page renders
 * customers' names, phone numbers and email addresses.
 */
export default async function SchoolTourQueuePage() {
  if (!(await isAdmin())) notFound();

  const queue = await fetchTourQueue();
  const outstanding = queue.pending.length + queue.missed.length;

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <PhoneCall className="w-3 h-3" />
          Internal · School Tours
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          {outstanding === 0 ? "No calls outstanding" : `${outstanding} school${outstanding === 1 ? "" : "s"} to call`}
        </h1>
        <p className="text-slate-500 text-sm mb-8 max-w-2xl">
          Tour requests reach schools by phone, not SMS — we hold four email addresses
          across 1,185 schools. A request only leaves this queue when someone has
          actually reached the school.
        </p>

        <SchoolTourQueue queue={queue} />
      </div>
    </div>
  );
}
