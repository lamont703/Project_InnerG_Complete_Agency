const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testQuery() {
  const query = "what shops are the best in 2026 for being successful";
  
  const res = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: query,
    config: { outputDimensionality: 768 }
  });
  const embedding = res.embeddings[0].values;
  const embStr = `[${embedding.join(',')}]`;

  console.log('--- BARBERS ---');
  const { data: barbers } = await supabase.rpc('search_barbers_ranked', {
    query_text: query,
    query_embedding: embStr,
    limit_val: 3
  });
  console.log(barbers?.map(b => `${b.name} - Score: ${b.match_score}`));

  console.log('--- SHOPS ---');
  const { data: shops } = await supabase.rpc('search_barbershops_ranked', {
    query_text: query,
    is_hiring_filter: false,
    rent_type_filter: '',
    limit_val: 3,
    offset_val: 0,
    query_embedding: embStr
  });
  console.log(shops?.map(s => `${s.shop_name} - Score: ${s.match_score}`));
}

testQuery();
