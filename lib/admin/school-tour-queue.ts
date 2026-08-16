import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The school tour call queue.
 *
 * WHY A QUEUE AND NOT A NOTIFICATION. Every other entity type on this site gets
 * an automated SMS when a request comes in. Schools cannot: we hold FOUR email
 * addresses across 1,185 schools (4 of 244 barber schools; the cosmetology
 * table has no email column at all), and phone is on 98.1%. There is no
 * automated channel that reaches a school, so a person has to call — and
 * `notify_channel = 'phone_call'` on the row is what keeps the escalation cron
 * from trying to re-send down a channel that does not exist.
 *
 * THE CALL IS ALSO THE SALES TOUCH, which is the reason this is worth staffing
 * rather than engineering around. It is the only conversation we get with a
 * school that has not claimed its listing, so `call_notes` is not an
 * afterthought — it is where the reason for making the call by hand actually
 * pays off.
 *
 * ORDERING IS BY TOUR DATE, NOT BY WHEN IT ARRIVED. A request for Thursday
 * beats one that came in earlier for the following month, because the thing
 * that expires is the tour date. Requests whose date has already passed are
 * surfaced separately rather than hidden — a missed one is the failure this
 * page exists to make visible.
 */

export interface TourQueueRow {
  id: string;
  schoolName: string | null;
  schoolPhone: string | null;
  schoolSlug: string | null;
  requestedDate: string;
  requestedTime: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerNotes: string | null;
  status: string;
  calledBy: string | null;
  callNotes: string | null;
  notifiedBusinessAt: string | null;
  createdAt: string;
  /** True when the tour date is in the past and nobody ever called. */
  missed: boolean;
}

export interface TourQueue {
  pending: TourQueueRow[];
  missed: TourQueueRow[];
  done: TourQueueRow[];
}

/** Local calendar day in Central, where the schools sit. */
function todayInCentral(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function toRow(r: any, today: string): TourQueueRow {
  const uncalled = !r.notified_business_at;
  return {
    id: r.id,
    schoolName: r.entity_name,
    schoolPhone: r.entity_phone,
    schoolSlug: r.entity_slug,
    requestedDate: r.requested_date,
    requestedTime: r.requested_time,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    customerNotes: r.customer_notes,
    status: r.status,
    calledBy: r.called_by,
    callNotes: r.call_notes,
    notifiedBusinessAt: r.notified_business_at,
    createdAt: r.created_at,
    missed: uncalled && r.requested_date < today,
  };
}

export async function fetchTourQueue(): Promise<TourQueue> {
  const db = createAdminClient();
  const today = todayInCentral();

  /**
   * Not filtered to uncalled rows in SQL. The page shows recently-completed
   * calls too, because "did anyone already ring this school today" is a
   * question two people working the same queue need answered — and the answer
   * has to be visible, not inferred from a row's absence.
   */
  const { data, error } = await db
    .from("booking_requests")
    .select(
      "id, entity_name, entity_phone, entity_slug, requested_date, requested_time, " +
        "customer_name, customer_phone, customer_email, customer_notes, status, " +
        "called_by, call_notes, notified_business_at, created_at"
    )
    .eq("request_type", "tour")
    .eq("notify_channel", "phone_call")
    .order("requested_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(500);

  if (error || !data) return { pending: [], missed: [], done: [] };

  const rows = data.map((r) => toRow(r, today));
  return {
    pending: rows.filter((r) => !r.notifiedBusinessAt && !r.missed),
    missed: rows.filter((r) => r.missed),
    done: rows
      .filter((r) => r.notifiedBusinessAt)
      .sort((a, b) => (b.notifiedBusinessAt || "").localeCompare(a.notifiedBusinessAt || ""))
      .slice(0, 50),
  };
}
