import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlEmail } from "@/lib/ghl-email";
import { SITE_URL } from "@/lib/site";
import type { ShortlistItem } from "@/lib/shortlist";

/**
 * "How did it go?" — the review ask, timed for after the visit.
 *
 * WHY THIS JOB EXISTS RATHER THAN A BUTTON ON THE PAGE. The traffic this whole
 * feature was built for arrives on a query like "blake charles salon reviews":
 * 16,727 impressions in 28 days, and every one of them is somebody who has NOT
 * been to the business yet. Asking them to write a review while they are still
 * deciding is asking about a visit that has not happened — right mechanism,
 * wrong moment. So the ask is deferred to three days after they saved a
 * shortlist, when a booking made off that research plausibly has happened and is
 * still recallable.
 *
 * OPT-IN ONLY. `followup_opt_in` is set from an unticked-by-default checkbox
 * that only appears once an email has been typed, and a shortlist saved without
 * an address can never qualify. Nobody gets this because they used the compare
 * tool.
 *
 * IDEMPOTENT BY CONSTRUCTION. `followup_sent_at` is stamped before nothing and
 * after every attempt, success or failure — a send that failed is still an
 * attempt, and retrying it on the next run would mean a second email to someone
 * who may well have received the first.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when that var is set. */
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** At most this many per run — a queue backlog should not become a send burst. */
const BATCH = 40;

function buildEmail(items: ShortlistItem[], token: string) {
  const names = items.map((i) => i.name).filter(Boolean);
  const list = names.slice(0, 4).map((n) => `<li style="margin:4px 0">${n}</li>`).join("");
  const subject =
    names.length === 1
      ? `Did you end up going to ${names[0]}?`
      : `Did you pick one of these ${names.length}?`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;line-height:1.55;color:#0f172a">
      <p>A few days ago you shortlisted these on ShearQuery:</p>
      <ul style="padding-left:20px;color:#334155">${list}</ul>
      <p><strong>Did you go?</strong> If you did, one line about how it went helps the next person
      standing exactly where you were — searching a business name and trying to work out whether
      it's any good.</p>
      <p style="margin:22px 0">
        <a href="${SITE_URL}/shortlist/${token}?review=1"
           style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700">
          Tell us how it went
        </a>
      </p>
      <p style="color:#64748b;font-size:13px">
        Your shortlist is still here: <a href="${SITE_URL}/shortlist/${token}">${SITE_URL}/shortlist/${token}</a><br>
        This is the only email we send about it — there's no list to unsubscribe from.
      </p>
    </div>`;
  return { subject, html };
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const supabase = createAdminClient();

  /*
   * Cast because the generated Supabase types are built from the pushed schema
   * and this migration has not been applied yet. Without it every field on the
   * row infers as `never` and the file will not compile — which is a real signal
   * worth keeping: it means `supabase db push` still has to happen.
   */
  const { data, error } = await (supabase as any)
    .from("shortlists")
    .select("id, share_token, email, name, items, followup_after")
    .eq("followup_opt_in", true)
    .is("followup_sent_at", null)
    .lte("followup_after", new Date().toISOString())
    .limit(BATCH);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type DueRow = { id: string; share_token: string; email: string | null; name: string | null; items: ShortlistItem[] };
  const due = ((data || []) as DueRow[]).filter((r) => r.email && Array.isArray(r.items) && r.items.length > 0);
  if (dry) {
    // Emails are not echoed, only counted — a dry run is for checking the
    // predicate, and a response body is an easy place to leak an address into
    // a log.
    return NextResponse.json({ dryRun: true, due: due.length });
  }

  let sent = 0;
  const failures: string[] = [];
  for (const row of due) {
    const { subject, html } = buildEmail(row.items as ShortlistItem[], row.share_token);
    const result = await sendGhlEmail({ email: row.email!, name: row.name || undefined, subject, html });
    if (result.ok) sent++;
    else failures.push(result.error || "unknown");

    // Stamped whether or not the send worked. See the header: a failed attempt
    // is still an attempt, and a retry risks a duplicate to someone who did get
    // the first one.
    await (supabase as any)
      .from("shortlists")
      .update({ followup_sent_at: new Date().toISOString() })
      .eq("id", row.id);
  }

  return NextResponse.json({ due: due.length, sent, failed: failures.length, failures: failures.slice(0, 5) });
}
