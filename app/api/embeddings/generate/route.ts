import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const { targetTable = 'agent_barbershop_leads' } = await request.json();
    let updatedCount = 0;

    if (targetTable === 'agent_barbershop_leads') {
      const { data: shops, error: fetchError } = await supabase
        .from('agent_barbershop_leads')
        .select('id, shop_name, city, ai_culture_summary, opportunity_status, rent_type')
        .is('embedding', null)
        .limit(50);

      if (fetchError) throw fetchError;

      for (const shop of shops || []) {
        const text = `${shop.shop_name || ''} in ${shop.city || ''}. Culture: ${shop.ai_culture_summary || ''}. Hiring Status: ${shop.opportunity_status || ''}. Rent: ${shop.rent_type || ''}`;
        
        try {
          const response = await ai.models.embedContent({
            model: 'gemini-embedding-2',
            contents: text,
            config: { outputDimensionality: 768 }
          });
          
          if (response.embeddings && response.embeddings[0].values) {
            const { error: updateErr } = await supabase
              .from('agent_barbershop_leads')
              .update({ embedding: response.embeddings[0].values })
              .eq('id', shop.id);
              
            if (updateErr) {
              console.error(`DB Update Error for shop ${shop.id}:`, updateErr);
            } else {
              updatedCount++;
            }
          }
        } catch (e) {
          console.error(`Failed to embed shop ${shop.id}:`, e);
        }
      }
    } else if (targetTable === 'scraped_web_pages') {
      const { data: pages, error: fetchError } = await supabase
        .from('scraped_web_pages')
        .select('id, url, raw_text')
        .is('embedding', null)
        .limit(50);

      if (fetchError) throw fetchError;

      for (const page of pages || []) {
        // truncate raw_text to fit within embedding token limits
        const textToEmbed = page.raw_text ? page.raw_text.substring(0, 4000) : '';
        const text = `URL: ${page.url || ''}. Content: ${textToEmbed}`;
        
        try {
          const response = await ai.models.embedContent({
            model: 'gemini-embedding-2',
            contents: text,
            config: { outputDimensionality: 768 }
          });
          
          if (response.embeddings && response.embeddings[0].values) {
            const { error: updateErr } = await supabase
              .from('scraped_web_pages')
              .update({ embedding: response.embeddings[0].values })
              .eq('id', page.id);
              
            if (updateErr) {
              console.error(`DB Update Error for page ${page.id}:`, updateErr);
            } else {
              updatedCount++;
            }
          }
        } catch (e) {
          console.error(`Failed to embed page ${page.id}:`, e);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Generated and saved ${updatedCount} embeddings for ${targetTable}`,
      updatedCount 
    });

  } catch (error: any) {
    console.error("Embedding Generation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
