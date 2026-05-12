import { GoogleAuth } from "google-auth-library";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/**
 * BARBER INTELLIGENCE: Google GenAI Bridge (Modern 2026 Architecture)
 * Using the @google/genai unified SDK.
 */

const DATASTORE_EXAM_PREP = "projects/gen-lang-client-0027817397/locations/global/collections/default_collection/dataStores/texas-state-barber-exam-prep_1778535345360";
const DATASTORE_QUESTION_BANK = "projects/gen-lang-client-0027817397/locations/global/collections/default_collection/dataStores/barber-question-bank-data-store_1778538120096";

const VALID_DOMAINS = [
  "sanitation_disinfection_safety",
  "hair_scalp_care",
  "nail_skin_care",
  "shaving",
  "licensing_regulation",
  "haircutting_hairstyling",
  "chemical_texture_services",
  "haircoloring"
];

export async function askBarberAgent(message: string, sessionId: string, telemetryContext?: any, psiMode: boolean = false) {
  const projectId = "gen-lang-client-0027817397";
  const location = "us-central1";
  const modelName = "gemini-1.5-flash-002"; 

  console.log(`[Google GenAI] Unified SDK Bridge called for session: ${sessionId}`);

  const clientConfig: any = {
    vertex: true,
    project: projectId,
    location: location,
  };

  if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    try {
      clientConfig.credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    } catch (e) {
      console.error("[Google GenAI] Credential parse error");
    }
  }

  // 1. Initialize modern client
  const genAI = new GoogleGenAI(clientConfig);

  // Build the student context string
  const domainBreakdown = telemetryContext?.performance_telemetry_snapshot?.domain_breakdown || [];
  const weakDomains = domainBreakdown
    .filter((d: any) => d.accuracy < 0.5)
    .map((d: any) => d.domain)
    .join(", ") || "All domains (baseline)";

  const studentContext = `
Student: ${telemetryContext?.user_context?.username || "Student"}
Pass Probability: ${telemetryContext?.performance_telemetry_snapshot?.estimated_pass_probability || "0%"}
Weak Domains: ${weakDomains}
Domain Breakdown: ${JSON.stringify(domainBreakdown)}
  `.trim();

  try {
    // ─────────────────────────────────────────────────────────
    // STEP 1: DIRECT DATA STORE QUERY
    // ─────────────────────────────────────────────────────────
    console.log("🔍 [BRAIN SIGNAL] Step 1: Querying Data Stores...");
    
    let groundedFacts = "";

    try {
      const authConfig: any = {
        scopes: "https://www.googleapis.com/auth/cloud-platform",
      };
      if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
        authConfig.credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      }
      const auth = new GoogleAuth(authConfig);
      const accessToken = await auth.getAccessToken();

      const [res1, res2] = await Promise.all([
        fetch(`https://discoveryengine.googleapis.com/v1/${DATASTORE_EXAM_PREP}/servingConfigs/default_config:search`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: `Texas barber exam ${weakDomains} regulations`, pageSize: 5 })
        }),
        fetch(`https://discoveryengine.googleapis.com/v1/${DATASTORE_QUESTION_BANK}/branches/default_branch/documents`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${accessToken}` }
        })
      ]);

      const data1 = await res1.json();
      const data2 = await res2.json();

      groundedFacts = `
Source A (Exam Prep): ${JSON.stringify(data1.results || [])}
Source B (Question Bank Examples): ${JSON.stringify(data2.documents?.slice(0, 10) || [])}
      `;
    } catch (err) {
      console.warn("[Google GenAI] Grounding failed, using base knowledge:", err);
    }

    // ─────────────────────────────────────────────────────────
    // STEP 2: GENERATION WITH NEW SDK
    // ─────────────────────────────────────────────────────────
    console.log("🧠 [BRAIN SIGNAL] Step 2: Generating adaptive deck...");

    const systemPrompt = `
      You are the Texas Barber Intelligence Diagnostic Engine.
      Generate a 10-question diagnostic deck for the Texas Class A Barber exam.
      
      CONTEXT: ${studentContext}
      ${psiMode ? "STRESS TEST MODE: Active." : "STANDARD MODE: Active."}
      GROUNDING: ${groundedFacts}

      Return ONLY JSON with "diagnostic_report" containing "student_id", "focus_areas", and "question_deck".
    `;

    // Modern 2026 Unified Call Pattern
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      config: { responseMimeType: "application/json" }
    });

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleanedJson = rawText.replace(/```json|```/g, "").trim();
    
    return JSON.parse(cleanedJson);

  } catch (error: any) {
    console.error("[Google GenAI] Fatal Error:", error);
    throw error;
  }
}
