import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlSms } from "@/lib/ghl-sms";
import { formatLocal } from "@/lib/calendar/time";
import type { Appointment } from "@/lib/calendar/store";
import type { BookablePro } from "@/lib/calendar/client-booking";

/**
 * Texts for client bookings: the client's confirmation, the pro's heads-up,
 * cancellations, and the day-before reminder.
 *
 * Through GoHighLevel, the same rails as the booking-request texts
 * (lib/ghl-sms.ts). "Sent" means GHL accepted it — landlines fail silently at
 * the carrier, so a recorded send is not proof of delivery. A2P 10DLC
 * registration must be confirmed before this runs at volume.
 *
 * A failed text never fails the booking: the appointment is real either way,
 * and notify_error records what went wrong for the pro to see.
 */

const db = () => createAdminClient() as any;

export async function sendText(phone: string, message: string) {
  return sendGhlSms({ phone, message: message.slice(0, 480) });
}

async function proPhone(providerId: string): Promise<string | null> {
  const { data } = await db()
    .from("calendar_providers")
    .select("member:community_members(phone)")
    .eq("id", providerId)
    .maybeSingle();
  return data?.member?.phone || null;
}

const where = (pro: BookablePro) => `${pro.provider.display_name}${pro.listing ? ` at ${pro.listing}` : ""}`;

export async function notifyBooked(args: { pro: BookablePro; appointment: Appointment; clientPhone: string; manageUrl: string }) {
  const { pro, appointment: a } = args;
  const when = formatLocal(new Date(a.starts_at), pro.provider.timezone);
  const errors: string[] = [];
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};

  const toClient = await sendText(
    args.clientPhone,
    `You're booked with ${where(pro)}: ${a.service_name}, ${when}. View or cancel: ${args.manageUrl} Reply STOP to opt out.`
  );
  if (toClient.ok) patch.client_notified_at = now;
  else errors.push(`client: ${toClient.error}`);

  const phone = await proPhone(pro.provider.id);
  if (phone) {
    const toPro = await sendText(
      phone,
      `New ShearQuery booking: ${a.client?.name || "a client"} — ${a.service_name}, ${when}.`
    );
    if (toPro.ok) patch.pro_notified_at = now;
    else errors.push(`pro: ${toPro.error}`);
  } else {
    errors.push("pro: no phone on file");
  }

  if (errors.length) patch.notify_error = errors.join("; ").slice(0, 300);
  await db().from("calendar_appointments").update(patch).eq("id", a.id);
}

export async function notifyCancelled(args: { pro: BookablePro; appointment: Appointment; by: "client" | "pro" }) {
  const { pro, appointment: a } = args;
  const when = formatLocal(new Date(a.starts_at), pro.provider.timezone);
  if (args.by === "client") {
    const phone = await proPhone(pro.provider.id);
    if (phone) await sendText(phone, `Cancelled on ShearQuery: ${a.client?.name || "a client"} — ${a.service_name}, ${when}. That time is open again.`);
  } else if (a.client?.phone) {
    await sendText(a.client.phone, `Your ${a.service_name} with ${where(pro)} on ${when} has been cancelled. Contact them to rebook.`);
  }
}

/** A client moved their own booking: tell them it's done, and tell the pro. */
export async function notifyMoved(args: { pro: BookablePro; before: Appointment; after: Appointment }) {
  const { pro, before, after } = args;
  const was = formatLocal(new Date(before.starts_at), pro.provider.timezone);
  const now = formatLocal(new Date(after.starts_at), pro.provider.timezone);
  if (after.client?.phone) await sendText(after.client.phone, `Moved: your ${after.service_name} with ${where(pro)} is now ${now} (was ${was}). Reply STOP to opt out.`);
  const phone = await proPhone(pro.provider.id);
  if (phone) await sendText(phone, `Rescheduled on ShearQuery: ${after.client?.name || "a client"} — ${after.service_name} moved from ${was} to ${now}.`);
}

/** The day-before reminder. Claimed first so two cron runs cannot both send it. */
export async function sendReminder(args: { pro: BookablePro; appointment: Appointment }) {
  const { pro, appointment: a } = args;
  const { data: claimed } = await db()
    .from("calendar_appointments")
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq("id", a.id)
    .is("reminder_sent_at", null)
    .select("id");
  if (!claimed?.length || !a.client?.phone) return false;
  const res = await sendText(
    a.client.phone,
    `Reminder: ${a.service_name} with ${where(pro)} tomorrow, ${formatLocal(new Date(a.starts_at), pro.provider.timezone)}. Reply STOP to opt out.`
  );
  if (!res.ok) await db().from("calendar_appointments").update({ notify_error: `reminder: ${res.error}`.slice(0, 300) }).eq("id", a.id);
  return res.ok;
}
