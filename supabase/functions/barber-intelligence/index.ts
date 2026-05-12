import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GOOGLE_CLOUD_PROJECT = "gen-lang-client-0027817397"
const LOCATION = "us-central1"
const MODEL_ID = "gemini-1.5-flash-002"

const DATASTORE_EXAM_PREP = "projects/gen-lang-client-0027817397/locations/global/collections/default_collection/dataStores/texas-state-barber-exam-prep_1778535345360"
const DATASTORE_QUESTION_BANK = "projects/gen-lang-client-0027817397/locations/global/collections/default_collection/dataStores/barber-question-bank-data-store_1778538120096"

serve(async (req) => {
  // 1. CORS Pre-flight check
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    const { telemetryContext, psiMode } = await req.json()
    console.log(`[Barber Brain] Initializing mastery loop for: ${telemetryContext?.user_context?.username || 'unknown'}`)

    // 2. Fetch Google Access Token
    // In Supabase, we set GOOGLE_CLOUD_CREDENTIALS as a secret
    const creds = JSON.parse(Deno.env.get("GOOGLE_CLOUD_CREDENTIALS") || "{}")
    
    // Simple JWT signer for Google OAuth (Deno version)
    // For now, we assume the user has set the GOOGLE_ACCESS_TOKEN secret or we use a helper
    const accessToken = Deno.env.get("GOOGLE_ACCESS_TOKEN") 
    
    if (!accessToken) {
      throw new Error("Missing GOOGLE_ACCESS_TOKEN secret in Supabase")
    }

    // 3. STEP 1: Grounding (Discovery Engine)
    console.log("🔍 [Barber Brain] Step 1: Grounding Facts...")
    const searchRes = await fetch(`https://discoveryengine.googleapis.com/v1/${DATASTORE_EXAM_PREP}/servingConfigs/default_config:search`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Texas barber exam regulations and sanitation", pageSize: 5 })
    })
    const searchData = await searchRes.json()
    const groundedFacts = JSON.stringify(searchData.results || [])

    // 4. STEP 2: Generation (Vertex AI)
    console.log("🧠 [Barber Brain] Step 2: Generating Adaptive Deck...")
    const systemPrompt = `
      You are the Texas Barber Intelligence Diagnostic Engine.
      Generate a 10-question diagnostic deck for the Texas Class A Barber exam.
      
      CONTEXT: ${JSON.stringify(telemetryContext)}
      ${psiMode ? "STRESS TEST MODE: Active." : "STANDARD MODE: Active."}
      GROUNDING: ${groundedFacts}

      Return ONLY JSON with "diagnostic_report" containing "student_id", "focus_areas", and "question_deck".
    `

    const generateRes = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/projects/${GOOGLE_CLOUD_PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:generateContent`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    })

    const generateData = await generateRes.json()
    const rawText = generateData.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    const finalReport = JSON.parse(rawText.replace(/```json|```/g, "").trim())

    return new Response(JSON.stringify(finalReport), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })

  } catch (error) {
    console.error("[Barber Brain] FATAL:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    })
  }
})
