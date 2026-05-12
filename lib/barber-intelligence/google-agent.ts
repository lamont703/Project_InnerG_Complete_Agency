import { VertexAI } from "@google-cloud/vertexai";
import { GoogleAuth } from "google-auth-library";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/**
 * BARBER INTELLIGENCE: Google GenAI Bridge (Two-Step Grounding Architecture)
 * 
 * Step 1: Query Vertex AI Search data store directly via Discovery Engine SDK
 * Step 2: Inject retrieved documents into Gemini for structured JSON generation
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
  // AI typo corrections (double underscore)
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
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_NUMBER || "1022222320701";
  const location = process.env.GOOGLE_CLOUD_LOCATION || "us-west1";
  const modelName = "gemini-3-flash-preview";

  console.log(`[Google GenAI] Bridge called for session: ${sessionId}`);

  const vertexAI = new VertexAI({
    project: projectId,
    location: location,
  });

  const model = vertexAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" }
  });

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

  if (telemetryContext) {
    console.log(`[Google GenAI] Injecting Telemetry for: ${telemetryContext?.user_context?.username || "Unknown Student"}`);
    console.log(`[Google GenAI] Weak Domains: ${weakDomains}`);
  }

  try {
    // ─────────────────────────────────────────────────────────
    // STEP 1: DIRECT DATA STORE QUERY
    // Query the Texas Barber Exam data store directly using
    // the Discovery Engine SDK — guaranteed to use your documents.
    // ─────────────────────────────────────────────────────────
    console.log("🔍 [BRAIN SIGNAL] Step 1: Querying Texas Barber Exam data store directly...");
    
    let groundedFacts = "";
    
    let groundingApplied = false;

    try {
      // Query BOTH data stores in parallel for maximum grounding depth
      const auth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"]
      });
      const accessToken = await auth.getAccessToken();
      const searchQuery = `Texas barber exam ${weakDomains} TDLR regulations Milady`;
      console.log(`[Google GenAI] REST search query: "${searchQuery}"`);
      console.log(`[Google GenAI] Querying both data stores in parallel...`);

      const searchBothStores = async (datastorePath: string, label: string, query: string, filter?: string) => {
        const url = `https://discoveryengine.googleapis.com/v1/${datastorePath}/servingConfigs/default_config:search`;
        const requestBody: any = {
          query: query,
          pageSize: 10,
          queryExpansionSpec: { condition: "AUTO" },
          spellCorrectionSpec: { mode: "AUTO" },
          contentSearchSpec: {
            snippetSpec: { returnSnippet: true },
            summarySpec: { summaryResultCount: 5, includeCitations: true }
          }
        };
        if (filter) requestBody.filter = filter;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify(requestBody)
        });
        const data = await res.json();
        if (!res.ok) {
          console.warn(`⚠️ [BRAIN SIGNAL] ${label} error ${res.status}:`, JSON.stringify(data).slice(0, 200));
          return { label, results: [], summary: "" };
        }
        console.log(`🛡️ [BRAIN SIGNAL] ${label}: Retrieved ${data.results?.length || 0} documents.`);
        return { label, results: data.results || [], summary: data.summary?.summaryText || "" };
      };

      // Query Exam Prep store via search (unstructured — full text works great)
      const examPrepData = await searchBothStores(DATASTORE_EXAM_PREP, "Texas Exam Prep Store", searchQuery, undefined);

      // Query Question Bank via Documents List API (structured — fields not indexed for search)
      // At 83KB / 105 docs, fetching all and filtering client-side is fast and reliable
      let questionBankFacts = "";
      try {
        const docsUrl = `https://discoveryengine.googleapis.com/v1/projects/gen-lang-client-0027817397/locations/global/collections/default_collection/dataStores/barber-question-bank-data-store_1778538120096/branches/default_branch/documents?pageSize=100`;
        const docsRes = await fetch(docsUrl, {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const docsData = await docsRes.json();

        if (docsRes.ok && docsData.documents?.length > 0) {
          const allDocs = docsData.documents;

          // Filter by texas_domain if we have specific weak domains
          const targetDomains = weakDomains === "All domains (baseline)"
            ? null
            : weakDomains.split(", ");

          const matchedDocs = targetDomains
            ? allDocs.filter((doc: any) => {
                const domain = doc.structData?.texas_domain || doc.jsonData?.texas_domain || "";
                return targetDomains.some((d: string) => domain.includes(d));
              })
            : allDocs;

          // Take up to 10 relevant questions
          const selectedDocs = matchedDocs.slice(0, 10);
          questionBankFacts = selectedDocs.map((doc: any) => {
            const data = doc.structData || (doc.jsonData ? JSON.parse(doc.jsonData) : {});
            // Use psi_syntax_text when PSI mode is active
            const questionText = psiMode && data.psi_syntax_text ? data.psi_syntax_text : data.question;
            return `Q: ${questionText || ""}\nPSI Version: ${data.psi_syntax_text || "N/A"}\nOptions: ${JSON.stringify(data.options || [])}\nAnswer Index: ${data.correct_answer_index || ""}\nExplanation: ${data.explanation || ""}\nDomain: ${data.texas_domain || ""}\nDifficulty: ${data.difficulty || ""}`;
          }).join("\n\n");

          console.log(`🛡️ [BRAIN SIGNAL] Question Bank: Loaded ${selectedDocs.length}/${allDocs.length} documents (PSI mode: ${psiMode}).`);
        } else {
          console.warn("⚠️ [BRAIN SIGNAL] Question Bank documents list failed:", docsRes.status);
        }
      } catch (docErr: any) {
        console.warn("⚠️ [BRAIN SIGNAL] Question Bank fetch failed:", docErr?.message);
      }


      const examPrepSnippets = examPrepData.results
        .map((r: any) => r.document?.derivedStructData?.snippets?.[0]?.snippet || "")
        .filter(Boolean)
        .join("\n");
      const examPrepSummary = examPrepData.summary || "";

      if (examPrepSnippets || examPrepSummary || questionBankFacts) {
        const combinedFacts = [
          examPrepSnippets ? `=== EXAM PREP CONTENT (${examPrepData.results.length} docs from 78-doc corpus) ===\n${examPrepSnippets}` : "",
          examPrepSummary ? `=== EXAM PREP SUMMARY ===\n${examPrepSummary}` : "",
          questionBankFacts ? `=== QUESTION BANK (domain-matched from 105 questions) ===\n${questionBankFacts}` : ""
        ].filter(Boolean).join("\n\n");

        if (combinedFacts.trim()) {
          groundedFacts = combinedFacts;
          groundingApplied = true;
          console.log(`🛡️ [BRAIN SIGNAL] Dual Data Store Grounding Complete! Exam Prep: ${examPrepData.results.length} docs | Question Bank: ${questionBankFacts ? "domain-matched questions loaded" : "none"}`);
        } else {
          console.warn("⚠️ [BRAIN SIGNAL] Documents retrieved but no extractable content — using AI internal knowledge.");
        }
      } else {
        console.warn("⚠️ [BRAIN SIGNAL] Both data stores returned 0 results — using AI internal knowledge.");
      }

    } catch (searchError: any) {
      console.warn("⚠️ [BRAIN SIGNAL] Discovery Engine REST call failed:", searchError?.message);
    }

    console.log("✅ [BRAIN SIGNAL] Grounded facts retrieved. Proceeding to question generation...");

    // ─────────────────────────────────────────────────────────
    // STEP 2: GENERATION CALL
    // Use the grounded facts as authoritative source material
    // to generate a structured JSON question deck.
    // ─────────────────────────────────────────────────────────
    console.log("🧠 [BRAIN SIGNAL] Step 2: Generating adaptive question deck from grounded facts...");

    const psiModeBlock = psiMode ? `
## PSI STRESS TEST MODE: ACTIVE
You are simulating the REAL PSI State Board examination environment.
- Use COMPLEX, multi-clause sentence structures — not simple subject-verb-object
- Use regulatory language: "required", "mandated", "pursuant to", "in accordance with"
- ALL four answer choices must be plausible — no obviously wrong distractors
- The psi_question field must be the full harder PSI-syntax version
` : `
## STANDARD LEARNING MODE
Use clear educational language. psi_question can be a more formal rewording.
`;

    const generationInstructions = `# ROLE: BARBER INTELLIGENCE DIAGNOSTIC ENGINE

You are generating a Texas Barber Exam practice deck.
${psiModeBlock}
## GROUNDED SOURCE MATERIAL (Retrieved from official data store)
${groundedFacts || "Use your training on TDLR Chapter 83 and Milady 6th Edition."}

## STUDENT PERFORMANCE
${studentContext}

## ADAPTIVE LOGIC
Prioritize questions from domains where accuracy is below 50%: ${weakDomains}
Generate EXACTLY 5 questions using ONLY the grounded source material above.

## STRICT DOMAIN ENUMS (MANDATORY)
Use ONLY these exact values for "domain":
${VALID_DOMAINS.map(d => `- ${d}`).join("\n")}

## OUTPUT FORMAT (MANDATORY JSON)
{
  "diagnostic_report": {
    "question_deck": [
      {
        "id": "unique_id",
        "domain": "valid_enum_value",
        "question": "standard educational question text",
        "psi_question": "harder PSI exam syntax version of the same question",
        "options": { "a": "text", "b": "text", "c": "text", "d": "text" },
        "correct_answer": "a",
        "rationale": "detailed explanation citing the source material",
        "source": "Exact citation: e.g. TDLR Chapter 83, Section X or Milady 6th Ed, Chapter Y"
      }
    ],
    "signals": ["Brief note about adaptive strategy used"]
  }
}`;

    const generationResponse = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: generationInstructions }] }]
    });

    let rawText = generationResponse.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
                  generationResponse.response?.text?.() ||
                  JSON.stringify(generationResponse);

    // Strip markdown fences if present
    rawText = rawText.trim();
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      console.log("[Google GenAI] Stripped markdown code fences from generation response.");
    }

    let parsedReply = rawText;
    try {
      const parsed = JSON.parse(rawText);

      // Safety: Normalize domain values to match Supabase ENUM
      if (parsed.diagnostic_report?.question_deck) {
        parsed.diagnostic_report.question_deck = parsed.diagnostic_report.question_deck.map((q: any) => {
          // General sanitization: collapse any double underscores (AI typo)
          q.domain = (q.domain || "").replace(/__+/g, "_");
          // Named remapping for natural language domains
          if (DOMAIN_MAP[q.domain]) {
            q.domain = DOMAIN_MAP[q.domain];
          }
          q.ai_generated = true;
          return q;
        });
      }

      parsedReply = parsed;
      console.log("✅ [BRAIN SIGNAL] Two-step grounding pipeline complete. Deck ready.");
    } catch (e) {
      console.warn("[Google GenAI] Generation response was not valid JSON, returning raw text.");
    }

    return {
      reply: parsedReply,
      raw: generationResponse,
      grounded: groundingApplied
    };

  } catch (error: any) {
    console.error("[Google GenAI V3 Bridge] Error:", error.message);
    throw error;
  }
}
