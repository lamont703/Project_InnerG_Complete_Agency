import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const MODEL_ID = "gemini-3.1-flash-lite" 
const DATASTORE_EXAM_PREP = "projects/gen-lang-client-0027817397/locations/global/collections/default_collection/dataStores/texas-state-barber-exam-prep_1778535345360"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  try {
    const { telemetryContext } = await req.json().catch(() => ({}));
    const accessToken = Deno.env.get("GOOGLE_ACCESS_TOKEN");
    
    const searchRes = await fetch(`https://discoveryengine.googleapis.com/v1/${DATASTORE_EXAM_PREP}/servingConfigs/default_config:search`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Texas barber exam regulations", pageSize: 5 })
    });
    const searchData = await searchRes.json().catch(() => ({}));
    const groundedFacts = JSON.stringify(searchData.results || []);

    const systemPrompt = `
      Generate 10 adaptive questions for student: ${telemetryContext?.user_context?.username || 'Candidate'}.
      GROUNDING: ${groundedFacts}
      
      DOMAINS TO USE (MUST MATCH DATABASE EXACTLY): 
      - sanitation_disinfection_safety
      - hair_scalp_care
      - shaving
      - licensing_regulation
      - chemical_texture_services
      - haircoloring
      - nail_skin_care
      - haircutting_hairstyling

      STRICT JSON FORMAT:
      {
        "diagnostic_report": {
          "question_deck": [
            { 
              "id": "ai_q_" + random_number,
              "domain": "one_from_list_above", 
              "question": "...",
              "options": { "a": "...", "b": "...", "c": "...", "d": "..." },
              "correct_answer": "a", 
              "rationale": "..."
            }
          ]
        }
      }
    `;

    const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      })
    });

    const generateData = await generateRes.json();
    let rawText = generateData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    rawText = rawText.replace(/```json|```/g, "").trim();

    let payload = JSON.parse(rawText);
    let questions = payload.diagnostic_report?.question_deck || payload.question_deck || [];

    const audited = questions.map((q: any) => {
      q.ai_generated = true;
      // Default to sanitation if domain is missing or wrong
      const validDomains = ["sanitation_disinfection_safety", "hair_scalp_care", "shaving", "licensing_regulation", "chemical_texture_services", "haircoloring", "nail_skin_care", "haircutting_hairstyling"];
      if (!validDomains.includes(q.domain)) q.domain = "sanitation_disinfection_safety";
      
      if (Array.isArray(q.options)) {
        const obj: any = {};
        q.options.slice(0, 4).forEach((opt: string, i: number) => {
          obj[String.fromCharCode(97 + i)] = opt;
        });
        q.options = obj;
      }
      return q;
    });

    return new Response(JSON.stringify({
      diagnostic_report: {
        student_id: telemetryContext?.user_context?.id || "unknown",
        question_deck: audited
      }
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
})
