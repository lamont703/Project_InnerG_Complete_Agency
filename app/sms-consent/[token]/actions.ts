"use server";

import { headers } from "next/headers";
import { recordSubmission, findByToken, markConfirmationSent } from "@/lib/sms-consent/store";
import { confirmationSms } from "@/lib/sms-consent/disclosure";
import { sendGhlSms } from "@/lib/ghl-sms";

/**
 * Step one of the double opt-in: they filled in the form.
 *
 * NO isAdmin() HERE, deliberately — this is a page for clients, and the token
 * is the authorisation. It is 24 bytes of CSPRNG output and scoped to one
 * customer record, so possession of the link is what proves who is answering.
 *
 * The IP and user agent are read server-side rather than accepted from the
 * client, because a self-reported IP is not evidence of anything.
 */
export async function submitConsent(input: {
  token: string;
  phone: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.token) return { ok: false, error: "This link is missing its code." };

  const existing = await findByToken(input.token);
  if (!existing) return { ok: false, error: "This link isn't valid any more." };
  if (existing.status === "confirmed" || existing.status === "synced") {
    return { ok: false, error: "You're already signed up for texts." };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;

  const saved = await recordSubmission({
    token: input.token,
    phone: input.phone,
    ip,
    userAgent: h.get("user-agent"),
  });
  if (!saved.ok) return saved;

  const firstName = (saved.record.clientName ?? "").trim().split(/\s+/)[0] || "there";
  const sent = await sendGhlSms({
    message: confirmationSms(firstName),
    phone: saved.record.phone,
    name: saved.record.clientName ?? undefined,
  });

  await markConfirmationSent(input.token, sent.ok ? undefined : sent.error ?? "send failed");

  if (!sent.ok) {
    // The submission is saved either way — losing it because the carrier
    // hiccuped would make them fill the form in twice.
    return { ok: false, error: "We couldn't send the confirmation text. Check the number and try again." };
  }
  return { ok: true };
}
