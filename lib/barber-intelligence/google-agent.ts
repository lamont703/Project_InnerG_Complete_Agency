/**
 * BARBER INTELLIGENCE: Supabase Edge Bridge
 * This bridge offloads the AI generation to Supabase Edge Functions
 * to resolve Vercel production timeouts and SDK crashes.
 */

export async function askBarberAgent(message: string, sessionId: string, telemetryContext?: any, psiMode: boolean = false) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/barber-intelligence`;

  console.log(`[Vercel Bridge] Offloading to Supabase: ${sessionId}`);

  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        telemetryContext,
        psiMode
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Supabase error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error: any) {
    console.error("[Vercel Bridge] FATAL:", error);
    throw error;
  }
}
