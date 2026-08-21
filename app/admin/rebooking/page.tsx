import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { fetchRebookingQueue } from "@/lib/rebooking/queue";
import { RebookingQueue } from "@/components/admin/rebooking-queue";
import { BOOKING_URL } from "@/lib/rebooking/messages";
import { fetchOutreachLog } from "@/lib/rebooking/outreach-log";
import { attribute, summarize } from "@/lib/rebooking/attribution";
import { RebookingImpact } from "@/components/admin/rebooking-impact";
import { fetchAgentSettings } from "@/lib/rebooking/agent";
import { fetchRecentRuns } from "@/lib/rebooking/audit";
import { AgentControls } from "@/components/admin/rebooking-agent-controls";
import { consentStats } from "@/lib/sms-consent/store";
import { SmsConsentCampaign } from "@/components/admin/sms-consent-campaign";
import { offerStats } from "@/lib/offers/haircut-offer";
import { HaircutOffersPanel } from "@/components/admin/haircut-offers-panel";
import { Scissors } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rebooking Agent | ShearQuery",
  robots: { index: false, follow: false },
};

/**
 * The first ShearQuery agent surface, tested on our own barbershop.
 *
 * WHAT IT DOES. Reads the Shopify order history for innergcomplete.com — where
 * every order is a visit to the chair — works out each client's personal
 * rhythm, and lists whoever is at or past it. There is no global "rebook after
 * four weeks" interval here because there is no such thing: the modelled
 * cadences run from about a week to over two months, and one schedule would be
 * wrong for nearly everyone.
 *
 * WHY IT DRAFTS RATHER THAN SENDS. The valuable and falsifiable claim is the
 * timing, and timing has to be right before automation is safe. A wrong send is
 * a client told they are overdue when they came in yesterday. So v1 puts the
 * list and the drafts in front of a person, and the send stays manual until the
 * due dates have been checked against reality for a few cycles.
 *
 * Gated by middleware (INTERNAL_TOOL_ROUTES) plus the isAdmin() guard here,
 * because middleware fails OPEN on an auth exception and this page renders
 * clients' names, phone numbers, email addresses and spend.
 */
export default async function RebookingPage() {
  if (!(await isAdmin())) notFound();

  let queue: Awaited<ReturnType<typeof fetchRebookingQueue>> | null = null;
  let impact: ReturnType<typeof summarize> | null = null;
  let agentSettings: Awaited<ReturnType<typeof fetchAgentSettings>> = null;
  let runs: Awaited<ReturnType<typeof fetchRecentRuns>> = [];
  let consent: Awaited<ReturnType<typeof consentStats>> | null = null;
  let consentEligible = 0;
  let offers: Awaited<ReturnType<typeof offerStats>> | null = null;
  let error: string | null = null;

  try {
    queue = await fetchRebookingQueue();
    if (!queue.notConfigured) {
      const log = await fetchOutreachLog();
      impact = summarize(attribute(log, queue.visitDaysByCustomer, queue.baseline, new Date()));
      [agentSettings, runs, consent, offers] = await Promise.all([
        fetchAgentSettings(),
        fetchRecentRuns(),
        consentStats(),
        offerStats(),
      ]);
      // Same exclusions as sendSmsConsentCampaign — a counter that disagrees
      // with what the button actually does is worse than no counter.
      consentEligible = [...queue.clients, ...queue.setAside, ...queue.recentlyContacted].filter(
        (c) =>
          !c.smsSubscribed &&
          c.email &&
          c.note?.status !== "inactive" &&
          !c.note?.mergedIntoCustomerId,
      ).length;
    }
  } catch (e) {
    // A Shopify outage or an expired credential must not blank the page with a
    // stack trace — the message is the actionable part.
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <Scissors className="w-3 h-3" />
          Internal · Rebooking Agent
        </span>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          {queue && !queue.notConfigured && !error
            ? queue.clients.length === 0
              ? "Nobody is due right now"
              : `${queue.clients.length} client${queue.clients.length === 1 ? "" : "s"} due for a cut`
            : "Rebooking Agent"}
        </h1>

        <p className="text-slate-500 text-sm mb-8 max-w-2xl">
          Every client has their own rhythm — some weekly, some every two months. This reads the
          barbershop&apos;s order history, learns each person&apos;s interval, and surfaces whoever
          is at or past theirs, ranked by what the lateness is worth per year.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 text-[13px] text-red-800">
            <strong className="block mb-1">Could not reach Shopify.</strong>
            <span className="font-mono text-[11px] break-all">{error}</span>
            <p className="mt-2 text-red-700">
              If this says 401, check that the Dev Dashboard app and the store are still in the same
              Shopify organization — the client credentials grant requires it.
            </p>
          </div>
        )}

        {queue?.notConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-[13px] text-amber-900">
            <strong className="block mb-1">Shopify is not connected.</strong>
            Set <code className="font-mono">SHOPIFY_SHOP</code>,{" "}
            <code className="font-mono">SHOPIFY_CLIENT_ID</code> and{" "}
            <code className="font-mono">SHOPIFY_CLIENT_SECRET</code> to enable this page.
          </div>
        )}

        {agentSettings && !error && <AgentControls settings={agentSettings} runs={runs} />}

        {consent && !error && <SmsConsentCampaign stats={consent} eligible={consentEligible} />}

        {offers && !error && <HaircutOffersPanel stats={offers} />}

        {queue && !queue.notConfigured && !error && impact && (
          <RebookingImpact summary={impact} baseline={queue.baseline} />
        )}

        {queue && !queue.notConfigured && !error && (
          <RebookingQueue
            clients={queue.clients}
            modelledClients={queue.modelledClients}
            totalOrders={queue.totalOrders}
            revenueAtRisk={queue.revenueAtRisk}
            setAside={queue.setAside}
            recentlyContacted={queue.recentlyContacted}
            roster={queue.roster}
            returningOnTheirOwn={queue.returningOnTheirOwn}
            generatedAt={queue.generatedAt}
            bookingUrl={BOOKING_URL}
          />
        )}
      </div>
    </div>
  );
}
