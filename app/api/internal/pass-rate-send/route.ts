import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendGhlEmail } from "@/lib/ghl-email";

/**
 * Sends the pass-rate email the school panel promised.
 *
 * MANUALLY FIRED, NOT A CRON. The three scheduled jobs in this app are
 * genuinely periodic; this is not. The trigger is "TDLR published and we
 * ingested it", which happens once or twice a year and which a person finds
 * out about, not a scheduler. A weekly job asking "is there new data?" would
 * either miss the release or fire on a half-loaded one — and these subscribers
 * handed over an address specifically because we are the accurate source, so a
 * wrong send spends that in a single go.
 *
 * DRY RUN BY DEFAULT. Nothing leaves without ?send=1. Read the report first.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     "https://agency.innergcomplete.com/api/internal/pass-rate-send?period=2026-27"
 *
 *   ...then the same with &send=1
 *
 * Resumable: rows already stamped with this period are skipped, so a run that
 * dies halfway can simply be run again.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Which columns hold the figures for a given release.
 *
 * The year is baked into column names (written_pass_rate_2026 and siblings),
 * so a new release means either new columns or refreshed ones — and which of
 * those happens is not knowable from here. Rather than guess, each period
 * names its own columns. When 2027 data lands, add one entry; nothing else in
 * this file changes.
 */
const PERIOD_COLUMNS: Record<string, { barber: string[]; cosmetology: string[] }> = {
  "2026-27": {
    barber: ["written_pass_rate_2026", "written_test_takers_2026", "practical_pass_rate_2026"],
    cosmetology: [
      "cosmetology_written_pass_rate_2026",
      "cosmetology_written_test_takers_2026",
      "cosmetology_practical_pass_rate_2026",
    ],
  },
};

const SITE = "https://agency.innergcomplete.com";
const pct = (v: unknown) => (v == null ? null : `${Math.round(Number(v) * (Number(v) <= 1 ? 100 : 1))}%`);

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function emailHtml(opts: {
  schoolName: string;
  slug: string | null;
  written: string | null;
  practical: string | null;
  takers: unknown;
  period: string;
}) {
  const url = opts.slug ? `${SITE}/schools/${opts.slug}` : `${SITE}/compare-schools`;
  const figures = [
    opts.written ? `<li><strong>Written exam pass rate:</strong> ${opts.written}</li>` : "",
    opts.practical ? `<li><strong>Practical:</strong> ${opts.practical}</li>` : "",
    opts.takers ? `<li><strong>Students tested:</strong> ${opts.takers}</li>` : "",
  ].join("");

  return `
    <p>You asked us to tell you when <strong>${opts.schoolName}</strong>'s next state board results published. They're out.</p>
    <ul>${figures}</ul>
    <p>See how that compares with every other school, side by side:<br>
      <a href="${url}">${opts.schoolName} on ShearQuery</a> &middot;
      <a href="${SITE}/compare-schools">Compare all schools</a>
    </p>
    <p>And the other half of what we promised you &mdash;
      <a href="${SITE}/questions-to-ask-a-barber-cosmetology-school">the three questions worth asking on your tour</a>.
      The first is about why the exam is written in language your textbook never uses.
    </p>
    <p style="color:#666;font-size:12px">You're getting this because you asked for ${opts.schoolName}'s ${opts.period} results on ShearQuery. That was the only email we promised.</p>
  `;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const period = request.nextUrl.searchParams.get("period") || "";
  const live = request.nextUrl.searchParams.get("send") === "1";
  const cols = PERIOD_COLUMNS[period];

  if (!cols) {
    return NextResponse.json(
      { ok: false, error: `Unknown period "${period}". Known: ${Object.keys(PERIOD_COLUMNS).join(", ")}` },
      { status: 400 }
    );
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Anyone not already emailed for THIS release.
  const { data: pending, error } = await db
    .from("school_pass_rate_alerts")
    .select("id,email,school_id,school_name,school_slug,ghl_contact_id,last_sent_period")
    .or(`last_sent_period.is.null,last_sent_period.neq.${period}`);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Group by school so each school's figures are fetched once, not per
  // subscriber.
  const bySchool = new Map<string, typeof pending>();
  for (const r of pending || []) {
    if (!bySchool.has(r.school_id)) bySchool.set(r.school_id, []);
    bySchool.get(r.school_id)!.push(r);
  }

  const report: any[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const [schoolId, rows] of bySchool) {
    // Schools live in two tables; try each.
    let figures: any = null;
    let kind: "barber" | "cosmetology" | null = null;

    const barber = await db
      .from("agent_barber_school_leads")
      .select(["school_name", "slug", ...cols.barber].join(","))
      .eq("id", schoolId)
      .maybeSingle();
    if (barber.data) {
      figures = barber.data;
      kind = "barber";
    } else {
      const cosmet = await db
        .from("agent_cosmetology_school_leads")
        .select(["school_name", "slug", ...cols.cosmetology].join(","))
        .eq("id", schoolId)
        .maybeSingle();
      if (cosmet.data) {
        figures = cosmet.data;
        kind = "cosmetology";
      }
    }

    const c = kind === "cosmetology" ? cols.cosmetology : cols.barber;
    const written = figures ? pct(figures[c[0]]) : null;
    const takers = figures ? figures[c[1]] : null;
    const practical = figures ? pct(figures[c[2]]) : null;
    const schoolName = figures?.school_name || rows[0].school_name || "your school";

    // No figures means nothing to say. The promise was "one email when the
    // results land" — mailing "no change yet" breaks it and burns the one
    // message these people agreed to.
    if (!written && !practical) {
      skipped += rows.length;
      report.push({ schoolId, schoolName, recipients: rows.length, action: "skipped — no figures for this period" });
      continue;
    }

    const html = emailHtml({ schoolName, slug: figures?.slug ?? rows[0].school_slug, written, practical, takers, period });

    for (const r of rows) {
      if (!live) {
        report.push({ schoolId, schoolName, email: r.email, written, practical, action: "would send" });
        continue;
      }
      const res = await sendGhlEmail({
        email: r.email,
        subject: `${schoolName}'s ${period} state board results are out`,
        html,
        contactId: r.ghl_contact_id || undefined,
      });
      if (res.ok) {
        // Stamped per row, immediately — so a crash on the next recipient
        // cannot re-send to this one.
        await db
          .from("school_pass_rate_alerts")
          .update({ last_sent_period: period, last_sent_at: new Date().toISOString() })
          .eq("id", r.id);
        sent++;
      } else {
        failed++;
        report.push({ schoolId, email: r.email, action: "FAILED", error: res.error });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    period,
    mode: live ? "SENT" : "dry run — add &send=1 to actually send",
    schools: bySchool.size,
    pending: pending?.length ?? 0,
    sent,
    skipped,
    failed,
    report: report.slice(0, 200),
  });
}
