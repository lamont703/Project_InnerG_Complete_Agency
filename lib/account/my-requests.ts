import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveMemberContext } from "@/lib/account/view-as";

/**
 * A CUSTOMER's own requests — the other side of /account/booking-requests.
 *
 * TWO DASHBOARDS, TWO DIRECTIONS. /account/booking-requests answers "who is
 * asking ME for an appointment" and is scoped by a claimed listing.
 * This one answers "what have I asked for" and is scoped by the member's own
 * verified email. Same table, opposite ends, and conflating them would show a
 * shop owner their customers' requests as if they were their own.
 *
 * THE JOIN IS THE VERIFIED EMAIL, AND VERIFIED IS DOING ALL THE WORK. The
 * address on community_members comes from Supabase auth, which means a magic
 * link to that mailbox was clicked. Matching booking_requests.customer_email
 * against a merely TYPED address would show a stranger's booking to anyone who
 * mistyped theirs — the reason nothing is joined until the callback runs.
 *
 * WHY NOT A FOREIGN KEY. It would need a nullable member id on four tables and
 * four migrations, and it would still miss the rows created before the account
 * existed — which is all of them. The email is already the identity that
 * created these rows. The trade is that changing your account email detaches
 * your history; at this size that is the right way round, and a backfill is one
 * query on the day it stops being.
 */

export interface MyRequest {
  id: string;
  kind: "appointment" | "tour";
  entityName: string | null;
  entityType: string;
  entitySlug: string | null;
  serviceName: string | null;
  requestedDate: string;
  requestedTime: string;
  status: string;
  createdAt: string;
  /** The business's number, once there is a reason to hand it over. */
  entityPhone: string | null;
}

export interface MyAlert {
  id: string;
  schoolName: string | null;
  createdAt: string;
}

export interface MyRequestsView {
  email: string;
  firstName: string | null;
  requests: MyRequest[];
  alerts: MyAlert[];
  openCount: number;
}

const OPEN = new Set(["new", "notified", "contacted"]);

const SEGMENT: Record<string, string> = {
  shop: "shop",
  salon: "salons",
  barber: "barbers",
  cosmetologist: "cosmetologists",
  school: "schools",
};

export function entityHref(r: MyRequest): string | null {
  const seg = SEGMENT[r.entityType];
  return seg && r.entitySlug ? `/${seg}/${r.entitySlug}` : null;
}

export async function fetchMyRequests(): Promise<{ status: 401 } | MyRequestsView> {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) return { status: 401 };

  const admin = createAdminClient();

  const { data: member } = await (admin.from("community_members") as any)
    .select("email, first_name")
    .eq("id", ctx.memberId)
    .maybeSingle();

  const email = member?.email;
  if (!email) {
    return { email: "", firstName: null, requests: [], alerts: [], openCount: 0 };
  }

  const { data: rows } = await (admin.from("booking_requests") as any)
    .select(
      "id, request_type, entity_name, entity_type, entity_slug, entity_phone, service_name, " +
        "requested_date, requested_time, status, created_at"
    )
    .ilike("customer_email", email)
    .order("requested_date", { ascending: false })
    .limit(100);

  const requests: MyRequest[] = ((rows || []) as any[]).map((r) => ({
    id: r.id,
    // request_type arrived with the school-tour migration; rows predating it
    // are appointments, which is what the column's own default says.
    kind: r.request_type === "tour" ? "tour" : "appointment",
    entityName: r.entity_name ?? null,
    entityType: r.entity_type,
    entitySlug: r.entity_slug ?? null,
    serviceName: r.service_name ?? null,
    requestedDate: r.requested_date,
    requestedTime: r.requested_time,
    status: r.status,
    createdAt: r.created_at,
    entityPhone: r.entity_phone ?? null,
  }));

  let alerts: MyAlert[] = [];
  try {
    const { data: a } = await (admin.from("school_pass_rate_alerts") as any)
      .select("id, school_name, created_at")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(50);
    alerts = ((a || []) as any[]).map((x) => ({
      id: x.id,
      schoolName: x.school_name ?? null,
      createdAt: x.created_at,
    }));
  } catch {
    // The alerts table's shape is not this page's business. A missing column
    // must not take down the requests list, which is the reason to be here.
  }

  return {
    email,
    firstName: member?.first_name ?? null,
    requests,
    alerts,
    openCount: requests.filter((r) => OPEN.has(r.status)).length,
  };
}
