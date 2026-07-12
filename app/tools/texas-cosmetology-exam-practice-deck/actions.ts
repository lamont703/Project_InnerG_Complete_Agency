"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Deliberately a simple interest-capture, not a full registration — see
// the cosmetology_prep_waitlist migration for why this isn't wired into
// the barber registration/deployment pipeline.
export async function joinCosmetologyPrepWaitlist(email: string, firstName?: string) {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { success: false, error: "Enter a valid email address." };
  }

  const { error } = await supabase.from("cosmetology_prep_waitlist").insert({
    email: trimmedEmail,
    first_name: firstName?.trim() || null,
  });

  if (error) {
    console.error("[CosmetologyWaitlist] Insert error:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  return { success: true };
}
