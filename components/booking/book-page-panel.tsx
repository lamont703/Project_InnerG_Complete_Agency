"use client";

import { CalendarBookingPanel, type CalendarInfo } from "@/components/calendar-booking-panel";

/** The website's booking panel, on a page of its own — there's no dialog to close. */
export function BookPagePanel({ info }: { info: CalendarInfo }) {
  return <CalendarBookingPanel info={info} onClose={() => window.scrollTo({ top: 0, behavior: "smooth" })} />;
}
