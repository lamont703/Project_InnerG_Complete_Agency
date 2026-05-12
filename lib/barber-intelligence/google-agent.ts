import { GoogleAuth } from "google-auth-library";
import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

/**
 * BARBER INTELLIGENCE: Google GenAI Bridge (Modern 2026 Architecture)
 * Using the @google/genai unified SDK.
 */

const DATASTORE_EXAM_PREP = "projects/gen-lang-client-0027817397/locations/global/collections/default_collection/dataStores/texas-state-barber-exam-prep_1778535345360";
const DATASTORE_QUESTION_BANK = "projects/gen-lang-client-0027817397/locations/global/collections/default_collection/dataStores/barber-question-bank-data-store_1778538120096";

export async function askBarberAgent(message: string, sessionId: string, telemetryContext?: any, psiMode: boolean = false) {
  const projectId = "gen-lang-client-0027817397";
  const location = "us-central1";
  const modelName = "gemini-1.5-flash-002"; 

  console.log(`[Google GenAI] Bridge called for session: ${sessionId}`);

  // 1. Resolve and Decode Credentials (Base64 Support)
  let rawCreds = process.env.GOOGLE_CLOUD_CREDENTIALS;
  if (rawCreds) {
    try {
      // If it looks like Base64 (doesn't start with {), decode it
      if (!rawCreds.trim().startsWith("{")) {
        console.log("[Google GenAI] Base64 credentials detected. Decoding...");
        rawCreds = Buffer.from(rawCreds, "base64").toString("utf-8");
      }

      const tempPath = path.join("/tmp", `google-creds-${Date.now()}.json`);
      fs.writeFileSync(tempPath, rawCreds);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
      console.log(`[Google GenAI] Credentials file-pinned at ${tempPath}`);
    } catch (e) {
      console.error("[Google GenAI] CRITICAL AUTH ERROR:", e);
    }
  }

  // 2. Initialize modern client
  const genAI = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location: location,
  });

  try {
    // ─────────────────────────────────────────────────────────
    // STEP 1: DIRECT DATA STORE QUERY
    // ─────────────────────────────────────────────────────────
    console.log("🔍 [BRAIN SIGNAL] Step 1: Querying Data Stores...");
    
    let groundedFacts = "";

    try {
      const auth = new GoogleAuth({
        scopes: "https://www.googleapis.com/auth/cloud-platform",
      });
      const accessToken = await auth.getAccessToken();

      const [res1, res2] = await Promise.all([
        fetch(`https://discoveryengine.googleapis.com/v1/${DATASTORE_EXAM_PREP}/servingConfigs/default_config:search`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: `Texas barber exam regulations`, pageSize: 5 })
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
      console.warn("[Google GenAI] Grounding failed (continuing without facts):", err);
    }

    // ─────────────────────────────────────────────────────────
    // STEP 2: GENERATION
    // ─────────────────────────────────────────────────────────
    console.log("🧠 [BRAIN SIGNAL] Step 2: Generating adaptive deck...");

    const response = await genAI.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: "Generate a 10-question Texas barber exam deck based on this context: " + JSON.stringify(telemetryContext) + "\nGrounding: " + groundedFacts }] }],
      config: { responseMimeType: "application/json" }
    });

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleanedJson = rawText.replace(/```json|```/g, "").trim();
    
    return JSON.parse(cleanedJson);

  } catch (error: any) {
    console.error("[Google GenAI] FATAL GENERATION ERROR:", error);
    throw error;
  }
}
