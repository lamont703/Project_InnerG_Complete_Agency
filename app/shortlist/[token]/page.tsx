import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Navbar } from "@/components/layout/navbar";
import { CompareTable } from "@/components/shortlist/compare-table";
import { hydrateShortlist, type ShortlistItem } from "@/lib/shortlist";

/**
 * A saved shortlist, by its share token.
 *
 * noindex: the token is the only thing protecting a list that can carry an email
 * address on its row, and an indexed share link would put it in a public
 * result set. `follow` stays on so the outbound profile links still count.
 *
 * The email is never selected here. It exists for the follow-up job and has no
 * business in a page anyone with the link can open.
 */
export const metadata: Metadata = {
  title: "A saved shortlist",
  robots: { index: false, follow: true },
};

export default async function SharedShortlist(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data } = await supabase
    .from("shortlists")
    .select("items, created_at")
    .eq("share_token", token)
    .maybeSingle();
  if (!data) notFound();

  const rows = await hydrateShortlist(supabase, (data.items || []) as ShortlistItem[]);

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-28 pb-24">
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">A saved shortlist</h1>
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-slate-600">
          Someone put these {rows.length} together to compare. Ratings and review counts are read
          live, so this stays current even though the list was saved on{" "}
          {new Date(data.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
        </p>
        {/* Not removable — this is somebody else's list. */}
        <CompareTable rows={rows} removable={false} />
      </main>
    </div>
  );
}
