import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGhlEmail } from "@/lib/ghl-email";
import { sendGhlSms } from "@/lib/ghl-sms";
import {
  SUPPORT_EMAIL, SUPPORT_PHONE, DAILY_LIMIT, cleanMessage, cleanTopic, supportEmail, supportSms, type SupportAlertInput,
} from "@/lib/support-rules";

/**
 * A support message from a signed-in member, from Claude or the /search chat
 * (contact_shearquery_support). SAVED FIRST, then emailed and texted to the
 * owner: a send that fails is recorded on the row, never a lost message.
 */

const db = () => createAdminClient() as any;

export async function submitSupportMessage(
  memberId: string,
  input: { message: unknown; topic?: unknown; door: "claude" | "site" },
): Promise<{ ok: true; id: string; notified: boolean } | { ok: false; error: string }> {
  const m = cleanMessage(input.message);
  if (!m.ok) return m;
  const topic = cleanTopic(input.topic);

  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { count } = await db().from("support_messages").select("id", { count: "exact", head: true }).eq("member_id", memberId).gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return { ok: false, error: `You've sent ${DAILY_LIMIT} support messages today, and they've all reached us. For anything urgent, email ${SUPPORT_EMAIL}.` };
  }

  const { data: member } = await db().from("community_members").select("first_name, last_name, email, phone, audience").eq("id", memberId).maybeSingle();
  const name = [member?.first_name, member?.last_name].filter(Boolean).join(" ") || null;
  const { data: row, error } = await db().from("support_messages").insert({
    member_id: memberId, member_name: name, member_email: member?.email ?? null, member_phone: member?.phone ?? null,
    audience: member?.audience ?? null, topic, message: m.message, door: input.door,
  }).select("id").single();
  if (error || !row) return { ok: false, error: "Couldn't send that just now. Try again in a minute." };

  const alert: SupportAlertInput = {
    id: row.id, name, email: member?.email ?? null, phone: member?.phone ?? null, audience: member?.audience ?? null,
    topic, message: m.message, door: input.door,
  };
  const errors: string[] = [];
  const patch: Record<string, unknown> = {};
  const e = supportEmail(alert);
  const er = await sendGhlEmail({ email: SUPPORT_EMAIL, name: "ShearQuery Support", subject: e.subject, html: e.html }).catch((x) => ({ ok: false, error: String(x?.message || x) }));
  if (er.ok) patch.email_sent_at = new Date().toISOString(); else errors.push(`email: ${er.error}`);
  const sr = await sendGhlSms({ phone: SUPPORT_PHONE, message: supportSms(alert) }).catch((x) => ({ ok: false, error: String(x?.message || x) }));
  if (sr.ok) patch.sms_sent_at = new Date().toISOString(); else errors.push(`sms: ${sr.error}`);
  if (errors.length) {
    patch.notify_error = errors.join("; ").slice(0, 500);
    console.error("[support] alert failed:", patch.notify_error);
  }
  await db().from("support_messages").update(patch).eq("id", row.id);
  return { ok: true, id: row.id, notified: errors.length === 0 };
}
