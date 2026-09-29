import Link from "next/link";
import { redirect } from "next/navigation";
import { Instagram, Lock } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberEmail } from "@/lib/instagram-member";
import { hasInstagramAccess } from "@/lib/feature-access";
import { DisconnectInstagramButton } from "@/components/account/disconnect-instagram-button";

/**
 * Connect your own Instagram so your Claude can read its stats through ShearQuery.
 *
 * In private testing: only members on INSTAGRAM_CONNECT_ALLOWLIST see the
 * connect button (lib/instagram-member.ts). Everyone else sees that it is
 * coming, rather than a button that fails at Meta's consent screen.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Instagram | ShearQuery",
  robots: { index: false, follow: false },
};

const MESSAGES: Record<string, { text: string; ok?: boolean }> = {
  connected: { text: "Instagram connected. Ask Claude how your Instagram is doing.", ok: true },
  denied: { text: "You cancelled on Instagram, so nothing was connected." },
  bad_state: { text: "That connection attempt expired or didn't match. Try again." },
  exchange_failed: { text: "Instagram didn't complete the connection. Try again in a minute." },
  store_failed: { text: "Connected on Instagram's side, but we couldn't save it. Try again." },
  not_available: { text: "Instagram is in private testing and isn't open on this account yet." },
  view_as: { text: "Exit View As before connecting an Instagram account." },
  missing_credentials: { text: "Instagram isn't configured on this server." },
  missing_code: { text: "Instagram didn't return a code. Try again." },
  no_member: { text: "Your login isn't linked to a ShearQuery membership yet." },
};

export default async function InstagramPage({ searchParams }: { searchParams: Promise<{ ig?: string; as?: string }> }) {
  const { ig, as } = await searchParams;
  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login?redirect=/account/instagram");
    return null;
  }

  const allowed = await hasInstagramAccess(await memberEmail(ctx.memberId));
  const { data: conn } = await (createAdminClient().from("member_instagram_connections") as any)
    .select("username, account_type, status, expires_at, updated_at")
    .eq("community_member_id", ctx.memberId)
    .maybeSingle();
  const note = ig ? MESSAGES[ig] : null;

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-slate-500">
          <Link href="/account/claude" className="hover:text-primary">Claude</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-700">Instagram</span>
        </nav>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
          <Instagram className="h-6 w-6" /> Instagram
        </h1>
        <p className="mt-3 leading-relaxed text-slate-600">
          Connect your business Instagram and your Claude can read your reach, your best posts, and how many people
          came from Instagram to your listing — then help you grow it. It can read your stats; it can&apos;t post,
          comment or message.
        </p>

        {note && (
          <p className={`mt-6 rounded-xl border p-4 text-sm font-semibold ${note.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            {note.text}{ig === "connected" && as ? ` (@${as})` : ""}
          </p>
        )}

        {!allowed ? (
          <div className="mt-8 flex gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Instagram for ShearQuery is in private testing. It opens to every owner once Instagram approves it.</span>
          </div>
        ) : conn ? (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-black">@{conn.username || "your account"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {conn.status === "connected" ? "Connected" : conn.status === "expired" ? "Expired — reconnect below" : "Needs attention — reconnect below"}
              {conn.account_type ? ` · ${conn.account_type.toLowerCase()} account` : ""}
              {conn.expires_at ? ` · renews automatically before ${new Date(conn.expires_at).toLocaleDateString()}` : ""}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/api/instagram/member/connect" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 hover:bg-slate-50">
                Reconnect
              </a>
              <DisconnectInstagramButton />
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              You&apos;ll sign in on Instagram and choose the business account. It must be a Business or Creator account.
            </p>
            <a
              href="/api/instagram/member/connect"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800"
            >
              <Instagram className="h-4 w-4" /> Connect Instagram
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
