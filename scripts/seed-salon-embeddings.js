const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function seedSalonEmbeddings() {
  console.log('Starting seed process for all remaining salons...');

  let hasMore = true;
  while (hasMore) {
    const { data: salons, error } = await supabase
      .from('agent_salon_leads')
      .select('*')
      .is('embedding', null)
      .limit(100);

    if (error) {
      console.error('Error fetching salons:', error);
      break;
    }

    if (!salons || salons.length === 0) {
      console.log('No salons found that need embeddings. We are done!');
      hasMore = false;
      break;
    }

    console.log(`Processing batch of ${salons.length} salons...`);

    for (const salon of salons) {
      try {
        const bio = `${salon.shop_name} is a hair & beauty salon located at ${salon.formatted_address || salon.city || 'Houston, TX'}.
        Categories: ${salon.place_types || 'Hair Salon'}.
        Rating: ${salon.rating || 'Unrated'} from ${salon.total_reviews || 0} reviews.`;

        const res = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: bio,
          config: { outputDimensionality: 768 }
        });

        const embedding = res.embeddings[0].values;

        const { error: updateError } = await supabase
          .from('agent_salon_leads')
          .update({ embedding: `[${embedding.join(',')}]` })
          .eq('id', salon.id);

        if (updateError) {
          console.error(`Error updating ${salon.shop_name}:`, updateError);
        } else {
          console.log(`Successfully updated ${salon.shop_name}`);
        }

        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`Failed to process ${salon.shop_name}:`, err);
      }
    }
  }
  console.log('Finished seeding ALL salon embeddings!');
}

seedSalonEmbeddings();
