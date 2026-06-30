import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    // 1. Fetch Failed Queries
    const { data: queries, error: fetchError } = await supabase
      .from('search_engine_queries')
      .select('raw_query')
      .eq('total_results', 0)
      .limit(50);
      
    if (fetchError || !queries) {
      throw new Error("Failed to fetch telemetry");
    }
    
    if (queries.length === 0) {
      return NextResponse.json({ message: "No failed queries to analyze.", stop_words_added: 0, searches_performed: 0, links_discovered: 0 });
    }

    const rawQueries = queries.map(q => q.raw_query);
    const uniqueQueries = Array.from(new Set(rawQueries));

    // 2. Ask Gemini to analyze
    const prompt = `
You are the Brain of a Barbershop and Cosmetology Domain Intelligence Search Engine.
Users are searching for things and getting 0 results. 
Analyze these failed queries:
${JSON.stringify(uniqueQueries)}

Your job is to return a JSON object with two arrays:
1. "new_stop_words": an array of conversational fluff words (e.g. "what", "are", "the", "offers", "best", "use") that we should strip from queries.
2. "missing_knowledge_searches": an array of optimal web Search query strings to find missing information. Only suggest searches for factual knowledge the engine lacks (e.g. "best barber clippers 2026"). Ignore generic location queries like "shops in houston".

Return ONLY valid JSON. Format:
{
  "new_stop_words": ["word1", "word2"],
  "missing_knowledge_searches": ["search query 1"]
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
      return NextResponse.json({ error: "Failed to parse LLM response" }, { status: 500 });
    }

    const { new_stop_words = [], missing_knowledge_searches = [] } = analysis;

    // 3. Insert new stop words
    if (new_stop_words.length > 0) {
      const { data: existingRules } = await supabase.from('search_engine_rules').select('value').eq('rule_type', 'stop_word');
      const existingWords = new Set((existingRules || []).map(r => r.value));
      
      const stopWordsToInsert = new_stop_words
        .filter((w: string) => !existingWords.has(w.toLowerCase()))
        .map((w: string) => ({
          rule_type: 'stop_word',
          value: w.toLowerCase(),
        }));
        
      if (stopWordsToInsert.length > 0) {
        await supabase.from('search_engine_rules').insert(stopWordsToInsert);
      }
    }

    // 4. Perform Serper API Search for missing knowledge
    const discoveredLinks = new Set<string>();
    for (const searchQuery of missing_knowledge_searches) {
      try {
        const serperRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": process.env.SERPER_API_KEY!,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ q: searchQuery })
        });
        
        if (!serperRes.ok) {
          console.error("Serper API Error:", await serperRes.text());
          continue;
        }
        
        const searchResults = await serperRes.json();
        const top3 = (searchResults.organic || []).slice(0, 3);
        
        top3.forEach((res: any) => {
          if (res.link && (res.link.startsWith('http://') || res.link.startsWith('https://'))) {
            discoveredLinks.add(res.link);
          }
        });
      } catch (err) {
        console.error("Serper API Exception:", err);
      }
    }

    // 5. Insert discovered links
    if (discoveredLinks.size > 0) {
      const linksToInsert = Array.from(discoveredLinks).map(url => ({
        discovered_url: url,
        status: 'Pending'
      }));

      await supabase.from('crawler_discovered_links').upsert(linksToInsert, { onConflict: 'discovered_url', ignoreDuplicates: true });
    }

    // Fetch ids for the queries we just processed
    const { data: queriesToDelete } = await supabase
      .from('search_engine_queries')
      .select('id')
      .eq('total_results', 0)
      .in('raw_query', uniqueQueries);
      
    if (queriesToDelete && queriesToDelete.length > 0) {
      await supabase.from('search_engine_queries').delete().in('id', queriesToDelete.map(q => q.id));
    }

    return NextResponse.json({ 
      message: "Analysis complete",
      stop_words_added: new_stop_words.length,
      searches_performed: missing_knowledge_searches.length,
      links_discovered: discoveredLinks.size
    });

  } catch (error: any) {
    console.error("Optimize API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
