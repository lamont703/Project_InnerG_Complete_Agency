import Link from "next/link";
import { unsubscribe } from "@/lib/live-training/store";

/** One-click unsubscribe from ShearQuery marketing email (lib/live-training/store.ts). */
export const dynamic = "force-dynamic";
export const metadata = { title: "Unsubscribe | ShearQuery", robots: { index: false, follow: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string }> }) {
  const q = await searchParams;
  const res = q.e && q.t ? await unsubscribe(q.e, q.t) : { ok: false as const };
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-md px-5 pt-28 text-center">
        <h1 className="text-2xl font-black">{res.ok ? "You're unsubscribed" : "That link didn't work"}</h1>
        <p className="mt-3 text-sm text-slate-600">
          {res.ok
            ? `We won't send training invitations or reminders to ${res.email} anymore. Account emails, like a booking confirmation, still come through.`
            : "The unsubscribe link looks incomplete. Reply to any of our emails with \"unsubscribe\" and we'll take care of it."}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-bold text-blue-700 underline">shearquery.com</Link>
      </main>
    </div>
  );
}
