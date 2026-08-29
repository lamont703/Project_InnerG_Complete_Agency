"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { currentMember } from "@/lib/member-context";
import { enrollShop, enrollmentForMember, claimedListings } from "@/lib/credit-report/store";

/**
 * Enroll a shop in credit reporting.
 *
 * REQUIRES AN ACCOUNT, and not for the usual reason. The enrollment itself
 * would be fine as an anonymous row — we have a phone and an email. What
 * cannot be anonymous is everything after it: this shop will be making written
 * statements about named people's payment behaviour, and every one of those
 * statements has to be attributable to somebody who can be asked about it.
 * A dispute against a row nobody owns has nowhere to go.
 */
export async function enrollShopAction(input: {
  shopId?: string | null;
  shopType?: "shop" | "salon" | null;
  shopName: string;
  address: string;
  email: string;
  smsPhone: string;
  shopLicenseNumber: string;
  dueDay: string;
  consented: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const member = await currentMember();
  if (!member) {
    return { ok: false, error: "Create a free ShearQuery account first — it takes about a minute." };
  }

  const required: [string, string][] = [
    ["shop name", input.shopName],
    ["address", input.address],
    ["email", input.email],
    ["SMS number", input.smsPhone],
    ["shop licence number", input.shopLicenseNumber],
  ];
  const missing = required.filter(([, v]) => !v?.trim()).map(([k]) => k);
  if (missing.length) {
    return { ok: false, error: `Still needed: ${missing.join(", ")}.` };
  }

  /*
   * Consent is checked here as well as in the form. The checkbox is a UI
   * affordance; this is the one that runs. Recurring automated messages to a
   * business number without a recorded agreement is the kind of thing that is
   * cheap to get right now and expensive to reconstruct later.
   */
  if (!input.consented) {
    return { ok: false, error: "We need your agreement to text that number before we can start." };
  }

  const existing = await enrollmentForMember(member.id);
  if (existing) {
    return { ok: false, error: "This account already has a shop enrolled. Manage it from your account menu." };
  }

  // Best-effort, for the consent record only. Never used to identify anyone.
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  } catch {
    ip = null;
  }

  /*
   * The listing is re-verified against the member's own claims rather than
   * trusted from the form. A shopId arriving in a request body is a claim
   * about ownership, and attaching payment reporting to a listing somebody
   * does not own would publish a record under another shop's name.
   */
  let shopId: string | null = null;
  let shopType: "shop" | "salon" | null = null;
  if (input.shopId) {
    const mine = await claimedListings(member.id);
    const hit = mine.find((l) => l.entityId === input.shopId);
    if (!hit) {
      return { ok: false, error: "That listing is not claimed by this account." };
    }
    shopId = hit.entityId;
    shopType = hit.entityType;
  }

  const res = await enrollShop(member.id, {
    shopId,
    shopType,
    shopName: input.shopName.trim(),
    address: input.address.trim(),
    email: input.email.trim(),
    smsPhone: input.smsPhone.trim(),
    shopLicenseNumber: input.shopLicenseNumber.trim(),
    dueDay: input.dueDay,
    consentIp: ip,
  });

  if (!res.ok) return { ok: false, error: res.error ?? "Could not enroll that shop." };

  revalidatePath("/account/credit-reporting");
  return { ok: true };
}
