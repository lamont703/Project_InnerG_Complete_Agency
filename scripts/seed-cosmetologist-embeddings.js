const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function seedCosmetologistEmbeddings() {
  console.log('Starting seed process for all remaining cosmetologists...');

  let hasMore = true;
  while (hasMore) {
    const { data: cosmetologists, error } = await supabase
      .from('agent_cosmetologist_leads')
      .select('*')
      .is('embedding', null)
      .limit(100);

    if (error) {
      console.error('Error fetching cosmetologists:', error);
      break;
    }

    if (!cosmetologists || cosmetologists.length === 0) {
      console.log('No cosmetologists found that need embeddings. We are done!');
      hasMore = false;
      break;
    }

    console.log(`Processing batch of ${cosmetologists.length} cosmetologists...`);

    for (const person of cosmetologists) {
      try {
        const serviceNames = Array.isArray(person.booksy_services)
          ? person.booksy_services.slice(0, 10).map((s) => s.name).join(', ')
          : '';

        const bio = `${person.name} is a beauty professional based in ${person.metro_area || person.address || 'Houston, TX'}.
        Services offered: ${serviceNames || 'General beauty services'}.
        Rating: ${person.booksy_rating || 'Unrated'} from ${person.booksy_review_count || 0} reviews.
        Price range: ${person.booksy_price_range || 'Varies'}.`;

        const res = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: bio,
          config: { outputDimensionality: 768 }
        });

        const embedding = res.embeddings[0].values;

        const { error: updateError } = await supabase
          .from('agent_cosmetologist_leads')
          .update({ embedding: `[${embedding.join(',')}]` })
          .eq('id', person.id);

        if (updateError) {
          console.error(`Error updating ${person.name}:`, updateError);
        } else {
          console.log(`Successfully updated ${person.name}`);
        }

        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`Failed to process ${person.name}:`, err);
      }
    }
  }
  console.log('Finished seeding ALL cosmetologist embeddings!');
}

seedCosmetologistEmbeddings();
