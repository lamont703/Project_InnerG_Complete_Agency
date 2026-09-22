"use server";

import { headers } from "next/headers";

/**
 * Join the ShearQuery waitlist.
 *
 * NO ACCOUNT, DELIBERATELY. Enrollment in credit reporting needs an account
 * because the shop then makes written statements about named people
 * (see app/shearquery-credit-report/actions.ts). Asking to be told when an offer
 * opens is not a claim about anybody, and a signup wall in front of a question
 * costs answers and protects nothing.
 *
 * A DUPLICATE IS A SUCCESS, NOT AN ERROR. The table has a unique index on
 * lower(email); somebody already on the list who signs up again should be told
 * they are on the list, because they are. Reporting "that email is taken" on a
 * waitlist is both useless to them and a disclosure that the address is in it.
 *
 * WRITES GO THROUGH THE SERVICE ROLE. shearquery_waitlist has RLS on with no
 * policies, matching every other table in this project that holds contact
 * details, so the anon key cannot reach it and this action is the only way in.
 */

const MAX_FIELD = 2_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

/*
 * Per-IP, in memory, same shape as app/api/contact/route.ts. It is per instance
 * rather than global and it resets on deploy — which is the right trade for a
 * form whose worst case is a duplicate row, and it stops the obvious flood.
 */
const hits = new Map<string, number[]>();

function rateLimited(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5_000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < RATE_LIMIT_WINDOW_MS)) hits.delete(k);
  }
  return recent.length > RATE_LIMIT_MAX;
}

const clean = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, MAX_FIELD) : null;
};

export async function joinWaitlistAction(input: {
  fullName: string;
  email: string;
  phone?: string;
  profession?: string;
  asiIntent?: string;
  source?: string;
  /** Honeypot. A real person never fills this; it is hidden from them. */
  website?: string;
}): Promise<{ ok: boolean; error?: string }> {
  /* A filled honeypot returns success, so a bot learns nothing from the reply. */
  if (clean(input.website)) return { ok: true };

  const fullName = clean(input.fullName);
  const email = clean(input.email)?.toLowerCase() ?? null;
  if (!fullName) return { ok: false, error: "Add your name so we know who we're writing to." };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "That email doesn't look right." };
  }

  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  } catch {
    ip = null;
  }
  if (rateLimited(ip)) {
    return { ok: false, error: "That's a lot of signups at once. Give it a minute and try again." };
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { error } = await (createAdminClient().from("shearquery_waitlist") as any).insert({
      full_name: fullName,
      email,
      phone: clean(input.phone),
      profession: clean(input.profession),
      asi_intent: clean(input.asiIntent),
      source: clean(input.source) ?? "waitlist_page",
    });
    /* 23505 is unique_violation: already on the list, which is the outcome they
       wanted. Anything else is a real failure and is surfaced. */
    if (error && (error as { code?: string }).code !== "23505") throw error;
  } catch (e) {
    console.error("[waitlist] insert failed", e);
    return { ok: false, error: "Couldn't save that. Try again in a moment." };
  }

  return { ok: true };
}
