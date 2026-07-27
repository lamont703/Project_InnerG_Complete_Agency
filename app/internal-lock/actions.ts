"use server"

import { createServerClient } from "@/lib/supabase/server"

// Single-user internal-tools gate. The allowed email lives ONLY here on the
// server so it never ships in the client bundle — the browser posts just the
// password and this action supplies the email during sign-in.
const ALLOWED_EMAIL = "lamont703@gmail.com"

export async function unlockInternal(password: string): Promise<{ ok: boolean; error?: string }> {
  if (!password) return { ok: false, error: "Password required." }

  try {
    const supabase = await createServerClient()
    // Clear any stale session for a different account first so a failed
    // sign-in can't leave a lingering cookie.
    await supabase.auth.signOut()

    const { error } = await supabase.auth.signInWithPassword({
      email: ALLOWED_EMAIL,
      password,
    })

    if (error) return { ok: false, error: "Incorrect password." }
    return { ok: true }
  } catch (err) {
    console.error("[InternalLock] Unexpected error:", err)
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}
