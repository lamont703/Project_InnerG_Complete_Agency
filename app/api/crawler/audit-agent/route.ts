import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    // 1. Fetch 10 pages that need auditing
    const { data: pages, error: fetchError } = await supabase
      .from('scraped_web_pages')
      .select('id, url, raw_text')
      .or('audit_status.eq.Pending,audit_status.is.null')
      .limit(10);

    if (fetchError || !pages || pages.length === 0) {
      return NextResponse.json({ message: "No pages need auditing." });
    }

    let validatedCount = 0;
    let flaggedCount = 0;

    // 2. Process each page
    for (const page of pages) {
      try {
        // We will send the first 1500 chars to Gemini to save tokens but get a good gist
        const snippet = page.raw_text.substring(0, 1500);

        const prompt = `
You are the Quality Control Audit Agent for a Barbershop, Beauty, and Cosmetology search engine.
We just crawled this website and extracted this text:

URL: ${page.url}
Text Content:
${snippet}

Evaluate if this text is genuinely relevant to the barbering, hair, beauty, or cosmetology industry. 
Keep in mind this is raw crawled text, so there may be UI junk, but look for the core subject matter.
Return ONLY valid JSON with no markdown formatting. Format:
{
  "score": <number between 0 and 100>,
  "reasoning": "<1 sentence explaining why>"
}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        let analysis;
        try {
          analysis = JSON.parse(response.text || '{}');
        } catch(e) {
          console.error("Failed to parse Gemini JSON", response.text);
          continue;
        }

        const score = analysis.score || 0;
        const reasoning = analysis.reasoning || "No reasoning provided.";
        
        const isApproved = score >= 80;

        // 3. Update the scraped_web_pages table
        await supabase.from('scraped_web_pages').update({
          audit_status: isApproved ? 'Validated' : 'Flagged',
          audit_score: score,
          audit_reasoning: reasoning
        }).eq('id', page.id);

        if (isApproved) {
          validatedCount++;
        } else {
          flaggedCount++;
        }

      } catch (err) {
        console.error(`Error auditing page ${page.url}:`, err);
      }
    }

    return NextResponse.json({ 
      message: "Audit complete",
      validated: validatedCount,
      flagged: flaggedCount,
      total_processed: pages.length
    });

  } catch (error: any) {
    console.error("Audit Agent API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
