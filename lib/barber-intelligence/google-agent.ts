import { GoogleAuth } from "google-auth-library";
import { createClient } from "@google/genai/server";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/**
 * BARBER INTELLIGENCE: Google GenAI Bridge (Modern 2026 Architecture)
 * Using the @google/genai unified SDK.
 */

const DATASTORE_EXAM_PREP = "projects/gen-lang-client-0027817397/locations/global/collections/default_collection/dataStores/texas-state-barber-exam-prep_1778535345360";
const DATASTORE_QUESTION_BANK = "projects/gen-lang-client-0027817397/locations/global/collections/default_collection/dataStores/barber-question-bank-data-store_1778538120096";

const DOMAIN_MAP: Record<string, string> = {
  "Infection Control": "sanitation_disinfection_safety",
  "Sanitation": "sanitation_disinfection_safety",
  "Health and Safety": "sanitation_disinfection_safety",
  "Hair Care": "hair_scalp_care",
  "Anatomy": "hair_scalp_care",
  "Skin Care": "nail_skin_care",
  "Shaving": "shaving",
  "Law": "licensing_regulation",
  "Regulations": "licensing_regulation",
  "Haircutting": "haircutting_hairstyling",
  "Chemical Services": "chemical_texture_services",
  "Coloring": "haircoloring",
  "hair__scalp_care": "hair_scalp_care",
  "nail__skin_care": "nail_skin_care",
  "haircutting__hairstyling": "haircutting_hairstyling",
  "chemical__texture_services": "chemical_texture_services",
  "sanitation__disinfection_safety": "sanitation_disinfection_safety",
  "licensing__regulation": "licensing_regulation"
};

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
  const modelName = "gemini-2.0-flash"; // Gemini 3.1 names are often variants of 2.0 in the transition SDK

  console.log(`[Google GenAI] Unified SDK Bridge called for session: ${sessionId}`);

  // 1. Initialize modern client
  const clientOptions: any = {
    projectId: projectId,
    location: location,
  };

  if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    try {
      clientOptions.credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    } catch (e) {
      console.error("[Google GenAI] Credential parse error");
    }
  }

  const client = createClient(clientOptions);

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

      // Parallel search for speed
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
    // STEP 2: GENERATION WITH GEMINI 2.0/3.1
    // ─────────────────────────────────────────────────────────
    console.log("🧠 [BRAIN SIGNAL] Step 2: Generating adaptive deck...");

    const systemPrompt = `
      You are the Texas Barber Intelligence Diagnostic Engine.
      Your task: Generate a high-fidelity 10-question diagnostic deck for the Texas Class A Barber exam.

      STUDENT PERFORMANCE CONTEXT:
      ${studentContext}

      ${psiMode ? "STRESS TEST MODE: Active. Use complex state board syntax and regulatory linguistics." : "STANDARD MODE: Active. Focus on pedagogical mastery."}

      GROUNDED FACTS FROM TDLR/MILADY:
      ${groundedFacts}

      STRICT JSON OUTPUT REQUIREMENT:
      Return ONLY a JSON object with this structure:
      {
        "diagnostic_report": {
          "student_id": "${telemetryContext?.user_context?.student_id || "unknown"}",
          "focus_areas": ["list weak areas here"],
          "question_deck": [
            {
              "id": "TXB-ID-001",
              "domain": "one of the valid domains listed below",
              "question": "The exam-style question text",
              "psi_question": "The complex regulatory version of the question",
              "options": { "a": "...", "b": "...", "c": "...", "d": "..." },
              "answer": "a",
              "rationale": "Detailed explanation citing source",
              "source": "Milady Chapter X / TDLR Section Y"
            }
          ]
        }
      }

      VALID DOMAINS:
      ${VALID_DOMAINS.join(", ")}
    `;

    const response = await client.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      config: { responseMimeType: "application/json" }
    });

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleanedJson = rawText.replace(/```json|```/g, "").trim();
    const finalReport = JSON.parse(cleanedJson);

    return finalReport;

  } catch (error: any) {
    console.error("[Google GenAI] Fatal Error:", error);
    throw error;
  }
}
