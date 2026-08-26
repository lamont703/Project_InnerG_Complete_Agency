import type { SchoolRoute } from "@/lib/voice/routing";

/**
 * The active routing table, shaped for the pure functions in ./routing.
 *
 * Shared by every voice route so the mapping from database columns to
 * SchoolRoute exists once. Three handlers each doing their own snake-to-camel
 * translation is three places for a column rename to hide.
 */
export async function loadRoutes(db: any): Promise<SchoolRoute[]> {
  const { data } = await db
    .from("school_call_routing")
    .select(
      "id, school_type, school_name, greeting_name, destination_number, main_number, tracking_number, voice_match_phrases, department_labels",
    )
    .eq("status", "active");
  return (data || []).map((r: any) => ({
    id: r.id,
    schoolType: r.school_type,
    schoolName: r.school_name,
    greetingName: r.greeting_name,
    destinationNumber: r.destination_number,
    mainNumber: r.main_number,
    trackingNumber: r.tracking_number ?? null,
    voiceMatchPhrases: r.voice_match_phrases || [],
    departmentLabels: r.department_labels || {},
  }));
}
