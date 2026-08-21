import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OutreachRecord } from "./attribution";

/**
 * Reading and writing the send log.
 *
 * Same `as any` cast as lib/rebooking/notes.ts and for the same reason:
 * types/database.ts predates this table, so every column resolves to `never`
 * without it. OutreachRecord is the real type boundary.
 */

interface Row {
  id: string;
  shopify_customer_id: string;
  client_name: string | null;
  sent_at: string;
  channel: string;
  cadence_days: number | string | null;
  days_overdue: number | string | null;
  lateness_bucket: string | null;
  annual_value: number | string | null;
  average_ticket: number | string | null;
  cost_cents: number;
}

const num = (v: number | string | null) => (v == null ? null : Number(v));

export async function fetchOutreachLog(): Promise<OutreachRecord[]> {
  const db = createAdminClient();
  const { data, error } = await (db.from("rebooking_outreach") as any)
    .select("*")
    .order("sent_at", { ascending: false });
  if (error) throw new Error(`Could not read outreach log: ${error.message}`);
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    shopifyCustomerId: r.shopify_customer_id,
    clientName: r.client_name,
    sentAt: r.sent_at,
    channel: (r.channel === "sms" || r.channel === "email" ? r.channel : "manual") as OutreachRecord["channel"],
    daysOverdue: num(r.days_overdue),
    latenessBucket: r.lateness_bucket,
    annualValue: num(r.annual_value),
    averageTicket: num(r.average_ticket),
    costCents: r.cost_cents ?? 0,
  }));
}

export interface LogOutreachInput {
  shopifyCustomerId: string;
  clientName: string | null;
  channel: "sms" | "email" | "manual";
  cadenceDays: number | null;
  daysOverdue: number | null;
  latenessBucket: string | null;
  annualValue: number | null;
  averageTicket: number | null;
  costCents?: number;
  messageNote?: string | null;
}

/**
 * Record a send. INSERT, never upsert — contacting the same client twice is two
 * events, and collapsing them would hide exactly the over-messaging this log
 * exists to make visible.
 */
export async function logOutreach(input: LogOutreachInput): Promise<void> {
  const db = createAdminClient();
  const { error } = await (db.from("rebooking_outreach") as any).insert({
    shopify_customer_id: input.shopifyCustomerId,
    client_name: input.clientName,
    channel: input.channel,
    cadence_days: input.cadenceDays,
    days_overdue: input.daysOverdue,
    lateness_bucket: input.latenessBucket,
    annual_value: input.annualValue,
    average_ticket: input.averageTicket,
    cost_cents: input.costCents ?? 0,
    message_note: input.messageNote ?? null,
  });
  if (error) throw new Error(`Could not log outreach: ${error.message}`);
}
