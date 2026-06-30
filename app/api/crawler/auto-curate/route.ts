import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import * as cheerio from 'cheerio';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    // 1. Fetch pending links
    const { data: pendingLinks, error: fetchError } = await supabase
      .from('crawler_discovered_links')
      .select('id, discovered_url')
      .eq('status', 'Pending')
      .limit(50); // Batch of 50 to process faster

    if (fetchError || !pendingLinks || pendingLinks.length === 0) {
      return NextResponse.json({ message: "No pending links to curate." });
    }

    let approvedCount = 0;
    let rejectedCount = 0;

    // 2. Process each link
    for (const link of pendingLinks) {
      try {
        // Scrape a tiny bit of context (just the title and meta description)
        let pageContext = link.discovered_url; // Default to just URL
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          const res = await fetch(link.discovered_url, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (res.ok) {
            const html = await res.text();
            const $ = cheerio.load(html);
            const title = $('title').text();
            const desc = $('meta[name="description"]').attr('content') || '';
            pageContext = `URL: ${link.discovered_url}\nTitle: ${title}\nDescription: ${desc}`;
          }
        } catch (e) {
          // If we can't scrape it, we'll just ask Gemini to guess from the URL
          console.warn(`Could not fetch context for ${link.discovered_url}`, e);
        }

        // 3. Ask Gemini to score
        const prompt = `
You are the Autonomous Curator for a Barbershop, Beauty, and Cosmetology search engine.
Evaluate the following webpage snippet:

${pageContext}

Determine how relevant this page is to the barbering, hair, beauty, or cosmetology industry.
Return ONLY valid JSON with no markdown formatting. Format:
{
  "score": <number between 0 and 100>,
  "reasoning": "<1 sentence explaining why>"
}
`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        const resultText = response.text;
        let analysis;
        try {
          analysis = JSON.parse(resultText || '{}');
        } catch(e) {
          console.error("Failed to parse Gemini JSON", resultText);
          continue;
        }

        const score = analysis.score || 0;
        const reasoning = analysis.reasoning || "No reasoning provided.";
        
        const isApproved = score >= 80;

        // 4. Update the audit log
        await supabase.from('crawler_discovered_links').update({
          status: isApproved ? 'Auto-Approved' : 'Auto-Rejected',
          ai_score: score,
          ai_reasoning: reasoning
        }).eq('id', link.id);

        // 5. If approved, add to seed domains
        if (isApproved) {
          approvedCount++;
          await supabase.from('crawler_seed_domains').insert({
            domain_url: link.discovered_url,
            status: 'Active'
          });
        } else {
          rejectedCount++;
        }

      } catch (err) {
        console.error(`Error curating link ${link.discovered_url}:`, err);
      }
    }

    return NextResponse.json({ 
      message: "Curation complete",
      approved: approvedCount,
      rejected: rejectedCount,
      total_processed: pendingLinks.length
    });

  } catch (error: any) {
    console.error("Auto-Curate API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
