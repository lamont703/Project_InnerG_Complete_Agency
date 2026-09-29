import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Plug, ShieldCheck, TriangleAlert } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { checkAuthorizeRequest } from "@/lib/mcp/oauth-authorize";
import { originFromHeaders } from "@/lib/mcp/oauth-metadata";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_ENTITY_TYPES } from "@/lib/gbp-audit-public";

/**
 * The consent screen an owner sees when Claude asks to connect.
 *
 * This page is the whole of "sign in instead of a secret link": the owner is
 * already signed in to ShearQuery (or is sent to /login and back), sees which
 * app is asking and where they will be returned, chooses whether it may
 * publish, and taps Allow. The POST goes to ./decision, which re-checks
 * everything rather than trusting this render.
 *
 * NAMED BY HOST. The app is named by the host of its client_id URL, which we
 * fetched and verified, not by the name its document claims — anyone can
 * publish a document that says "Claude". A host we recognise gets its name;
 * anything else is shown bare, with a warning.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Connect an app | ShearQuery",
  robots: { index: false, follow: false },
};

const SCOPE_TEXT: Record<string, string> = {
  read: "See your claimed listing, your audit, and your Google profile — hours, reviews, posts, photos, services.",
  propose: "Draft changes to your Google profile for you to review. A draft changes nothing on Google.",
};

/**
 * With no business on the account — a client booking a haircut from their AI,
 * most often — the Google profile wording above describes nothing they have.
 * The scopes granted are the same; this says what they mean for this person.
 */
const CLIENT_TEXT = [
  "Find barbers and stylists and see their open times.",
  "Book, move and cancel your own appointments, after you confirm your mobile number with a text code.",
  "See the appointments you've booked.",
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-lg px-5 pt-28 pb-20 sm:px-6">{children}</main>
    </div>
  );
}

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const origin = originFromHeaders(await headers());

  const check = await checkAuthorizeRequest(params, origin);
  if (check.kind === "fatal") {
    return (
      <Shell>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="flex items-center gap-2 text-lg font-black text-rose-900">
            <TriangleAlert className="h-5 w-5" /> This connection request can&apos;t continue
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-rose-900">{check.message}</p>
          <p className="mt-3 text-xs text-rose-800">Nothing was shared. Close this window and try connecting again from the app.</p>
        </div>
      </Shell>
    );
  }
  if (check.kind === "redirect") redirect(check.url);
  const req = check.req;

  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) {
      const here = `/oauth/authorize?${new URLSearchParams(params as Record<string, string>).toString()}`;
      redirect(`/login?redirect=${encodeURIComponent(here)}`);
    }
    return (
      <Shell>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-black">Your login isn&apos;t linked to a ShearQuery membership yet.</p>
          <p className="mt-2">Finish setting up your account, then connect again from the app.</p>
        </div>
      </Shell>
    );
  }
  if (ctx.impersonating) {
    return (
      <Shell>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          You are viewing as {ctx.viewingAs?.name ?? "another member"}. Exit View As before connecting an app — a
          connection is permission to act under that account&apos;s name.
        </div>
      </Shell>
    );
  }

  // Which business this connection will speak for — said on the screen so an
  // owner with the wrong login notices before they tap Allow.
  const admin = createAdminClient();
  const { data: link } = await (admin.from("community_member_entity_links") as any)
    .select("entity_type, entity_id")
    .eq("community_member_id", ctx.memberId)
    .maybeSingle();
  let business: string | null = null;
  const cfg = link ? PUBLIC_ENTITY_TYPES[link.entity_type] : null;
  if (cfg) {
    const { data: row } = await (admin.from(cfg.table) as any).select(cfg.nameField).eq("id", link.entity_id).maybeSingle();
    business = row?.[cfg.nameField] ?? null;
  }

  const appName = req.clientName || req.clientHost;
  const wantsPublish = req.scopes.includes("publish");

  return (
    <Shell>
      <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
        <Plug className="h-3 w-3" /> Connect an app
      </span>
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
        {appName} wants to connect to your ShearQuery account
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {business ? (
          <>It will act for <strong className="font-black text-slate-900">{business}</strong>.</>
        ) : (
          <>No business is linked to this account, so it can look things up and manage your own appointments. If you own a business, claim it on ShearQuery and this connection can help run its Google profile too.</>
        )}
      </p>

      {!req.clientName && (
        <div className="mt-5 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            ShearQuery doesn&apos;t recognise <strong>{req.clientHost}</strong>
            {req.claimedName ? <> (it calls itself &quot;{req.claimedName}&quot;)</> : null}. Only continue if you started
            this connection yourself.
          </span>
        </div>
      )}
      {req.loopbackOnly && (
        <div className="mt-5 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This sends you back to a program on this computer ({req.redirectHost}), such as Claude Code. Only continue if
            you just ran it.
          </span>
        </div>
      )}

      <form method="post" action="/oauth/authorize/decision" className="mt-6 space-y-4">
        {Object.entries(params).map(([k, v]) =>
          typeof v === "string" && k !== "decision" && k !== "publish" ? <input key={k} type="hidden" name={k} value={v} /> : null
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">It will be able to</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
            {(business ? req.scopes.filter((s) => s !== "publish").map((s) => SCOPE_TEXT[s]) : CLIENT_TEXT).map((line) => (
              <li key={line} className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{line}</li>
            ))}
          </ul>
          {wantsPublish && business && (
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              <input type="checkbox" name="publish" value="yes" defaultChecked className="mt-1 h-4 w-4 shrink-0 accent-slate-900" />
              <span>
                <strong className="font-black">Also publish changes to my Google profile.</strong> It shows you each
                change and asks before publishing, we email you every change it makes, and most can be undone. Untick
                this to let it look and draft only.
              </span>
            </label>
          )}
          <p className="mt-4 text-xs text-slate-500">
            {business ? "It can't change your business name, address or main category, or see your password or payment details." : "It can't see your password or payment details."}
          </p>
        </section>

        <p className="text-xs text-slate-500">
          After you choose, you&apos;ll go back to <strong className="font-black text-slate-700">{req.redirectHost}</strong>.
          You can disconnect any time at shearquery.com/account/claude.
        </p>

        <div className="flex gap-3">
          <button
            type="submit"
            name="decision"
            value="allow"
            className="flex-1 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Allow
          </button>
          <button
            type="submit"
            name="decision"
            value="deny"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Shell>
  );
}
