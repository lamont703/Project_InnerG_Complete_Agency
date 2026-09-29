import "server-only";
import type { BookablePro } from "@/lib/calendar/client-booking";
import type { CalendarInfo } from "@/components/calendar-booking-panel";
import { paymentTerms } from "@/lib/calendar/payments";
import { amountDueCents, policyLines } from "@/lib/calendar/policy";

/**
 * What the booking screen needs about a pro — the Book button's dialog and
 * the /book/<handle> page both build it here, so the payment and cancellation
 * terms a client sees before booking can't differ between the two.
 */
export async function calendarInfoFor(pro: BookablePro): Promise<CalendarInfo> {
  const terms = await paymentTerms(pro.provider);
  return {
    providerId: pro.provider.id,
    name: pro.provider.display_name,
    listing: pro.listing,
    timezone: pro.provider.timezone,
    windowDays: pro.provider.booking_window_days,
    services: pro.services.map((s) => ({
      id: s.id, name: s.name, minutes: s.duration_minutes, priceCents: s.price_cents,
      dueCents: amountDueCents(terms.policy, terms.mode, s.price_cents),
      policy: policyLines(terms.policy, terms.mode, s.price_cents),
    })),
    payment: { mode: terms.mode, tips: terms.tipsAvailable },
  };
}
