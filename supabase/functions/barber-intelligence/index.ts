import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MODEL_CANDIDATES = ["models/gemini-3.1-flash-lite", "models/gemini-3.1-pro-preview"];
const STORE_UNSTRUCTURED = "projects/gen-lang-client-0027817397/locations/global/collections/default_collection/dataStores/texas-state-barber-exam-prep_1778535345360";

async function importPrivateKey(pem: string) {
  const match = pem.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
  const base64 = match[1].replace(/\s/g, "").replace(/\\n/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return await crypto.subtle.importKey("pkcs8", bytes.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

async function signJwt(payload: any, pem: string) {
  const enc = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const header = enc({ alg: "RS256", typ: "JWT" });
  const pay = enc(payload);
  const data = new TextEncoder().encode(`${header}.${pay}`);
  const key = await importPrivateKey(pem);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, data);
  const sigEnc = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${pay}.${sigEnc}`;
}

async function getAccessToken(sa: any) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt({ iss: sa.client_email, sub: sa.client_email, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600, scope: "https://www.googleapis.com/auth/cloud-platform" }, sa.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
  const data = await res.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const debugSignals = [];
  let tacticalQuestions = [];

  try {
    const body = await req.json().catch(() => ({}));
    const telemetry = body.telemetryContext || {};
    
    // DEBUG: Verify Telemetry Ingestion
    debugSignals.push(`[COGNITIVE] Telemetry Received: ${telemetry && Object.keys(telemetry).length > 0 ? 'YES' : 'NO'} (Keys: ${Object.keys(telemetry).join(", ")})`);
    
    const performance = telemetry.performance_telemetry_snapshot || {};
    
    // DEBUG: Trace incoming performance payload
    debugSignals.push(`[COGNITIVE] Performance Snapshot Keys: ${Object.keys(performance).join(", ")}`);
    if (performance.estimated_pass_probability === undefined) {
        debugSignals.push(`[COGNITIVE] WARNING: estimated_pass_probability is missing in payload`);
    }
    const saJsonRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    // 1. Identify Balanced Target Domains (70/20/10 Rule)
    const breakdown = performance.domain_breakdown || [];
    
    // Sorts for different draws
    const sortedByScore = [...breakdown].sort((a: any, b: any) => parseFloat(a.mastery_score || "0") - parseFloat(b.mastery_score || "0"));
    const sortedByDate = [...breakdown].sort((a: any, b: any) => new Date(a.last_attempt_at || 0).getTime() - new Date(b.last_attempt_at || 0).getTime());

    const targeted = new Set<string>();

    // DRAW 1: Remediation (The 2 Weakest)
    sortedByScore.slice(0, 2).forEach(d => targeted.add(d.domain));

    // DRAW 2: Decay (The 1 Oldest/Forgotten)
    const oldest = sortedByDate.find(d => !targeted.has(d.domain));
    if (oldest) targeted.add(oldest.domain);

    // DRAW 3: Confidence (The 1 Strongest)
    const strongest = [...sortedByScore].reverse().find(d => !targeted.has(d.domain));
    if (strongest) targeted.add(strongest.domain);

    const weakDomains = Array.from(targeted);
    
    // DEBUG: Inspect Balanced Mix
    debugSignals.push(`[COGNITIVE] Balanced Mix: ${weakDomains.join(", ")}`);

    // 2. Parallel Pre-fetch (Filtered DB + Auth)
    const dbQuery = supabase.from('question_bank').select('*').eq('is_active', true);
    if (weakDomains.length > 0) dbQuery.in('domain', weakDomains);

    const [dbResult, token] = await Promise.all([
        dbQuery.limit(40), // Pull a wider pool for variability
        saJsonRaw ? getAccessToken(JSON.parse(saJsonRaw)) : Promise.resolve("")
    ]);
    
    // Randomized Selection for Tactical Deck
    const pool = dbResult.data || [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    tacticalQuestions = shuffled.slice(0, 10);
    
    if (token) debugSignals.push(`[AUTH] Handshake Successful`);

    // 3. Grounding with Targeted Query
    let legalSnippets = [];
    if (token) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);
            
            const targetQuery = weakDomains.length > 0 
                ? `Texas Barber Laws and Milady Barbering Textbook requirements for ${weakDomains.join(", ")}`
                : "Texas Barber Laws, and Milady Barbering Textbook";

            const gdeRes = await fetch(`https://discoveryengine.googleapis.com/v1/${STORE_UNSTRUCTURED}/servingConfigs/default_config:search`, {
                method: "POST",
                signal: controller.signal,
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ query: targetQuery, pageSize: 12, contentSearchSpec: { snippetSpec: { returnSnippet: true } } })
            });
            clearTimeout(timeoutId);
            const gdeData = await gdeRes.json();
            const results = gdeData.results || [];
            debugSignals.push(`[GROUNDING] Query: "${targetQuery}"`);
            debugSignals.push(`[GROUNDING] Results Found: ${results.length}`);
            
            // NEW: Source Inventory Trace
            results.forEach((r: any, i: number) => {
                const doc = r.document || {};
                const title = doc.derivedStructData?.title || doc.name?.split('/').pop() || "Unknown Document";
                debugSignals.push(`[GROUNDING] Item #${i+1}: ${title}`);
            });

            legalSnippets = results.map((r: any) => r.document?.derivedStructData?.snippets?.[0]?.snippet || r.document?.name || "").filter(s => s);
        } catch (e) { debugSignals.push(`[GROUNDING] BAILOUT: ${e.message}`); }
    }

    // 4. Synthesis with Dynamic Model Selection
    let payload = { cognitive_insight: null, question_deck: [] };
    const candidates = [...MODEL_CANDIDATES];
    if (body.isMockExam) {
        // Promote Pro Preview for Mock Exams
        candidates.reverse();
        debugSignals.push(`[COGNITIVE] High-Fidelity Mode: Promoting Pro Preview for Mock Exam`);
    }

    for (const modelId of candidates) {
        try {
            const systemPrompt = `Build 10-question adaptive deck. Student Pass Prob: ${performance.estimated_pass_probability}. Grounding: ${legalSnippets.join("\n")}. Bank: ${JSON.stringify(tacticalQuestions)}. Return JSON { "cognitive_insight": "string", "question_deck": [] }.`;
            
            // FULL-SPECTRUM TRACE
            debugSignals.push(`[SYNTHESIS] Goal (v1beta/${modelId}): Build 10-question deck for student at ${performance.estimated_pass_probability} probability.`);
            debugSignals.push(`[SYNTHESIS] Grounding Peek: ${legalSnippets.join(" | ").slice(0, 1000)}...`);
            debugSignals.push(`[SYNTHESIS] Reference Bank: ${tacticalQuestions.length} questions identified. (Sample: ${tacticalQuestions.map(q => q.question.slice(0, 40)).join(" | ")})`);

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${geminiApiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: systemPrompt }] }], 
                    generationConfig: { responseMimeType: "application/json", temperature: 0.1 } 
                })
            });
            const data = await res.json();
            if (data.error) {
                debugSignals.push(`[SYNTHESIS] REJECTED: ${data.error.message}`);
                continue;
            }
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            payload = JSON.parse(rawText.match(/\{[\s\S]*\}/)?.[0] || "{}");
            if (payload.question_deck?.length > 0) {
                debugSignals.push(`[SYNTHESIS] SUCCESS via ${modelId}`);
                break;
            }
        } catch (e) { continue; }
    }

    if (!payload.question_deck || payload.question_deck.length === 0) {
        payload.question_deck = tacticalQuestions.map(q => ({ id: q.id, domain: q.domain, question: q.question, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options, correct_index: q.correct_index, explanation: q.explanation }));
        payload.cognitive_insight = "Diagnostic Baseline active.";
    }

    return new Response(JSON.stringify({ diagnostic_report: { cognitive_insight: payload.cognitive_insight, question_deck: payload.question_deck, debug_signals: debugSignals } }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ diagnostic_report: { error: error.message, debug_signals: debugSignals } }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
})
