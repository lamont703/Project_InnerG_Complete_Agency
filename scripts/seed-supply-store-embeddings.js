const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function seedSupplyStoreEmbeddings() {
  console.log('Starting seed process for all remaining barber supply stores...');

  let hasMore = true;
  while (hasMore) {
    // Fetch stores that don't have embeddings yet
    const { data: stores, error } = await supabase
      .from('agent_barber_supply_store_leads')
      .select('*')
      .is('embedding', null)
      .limit(100);

    if (error) {
      console.error('Error fetching stores:', error);
      break;
    }

    if (!stores || stores.length === 0) {
      console.log('No supply stores found that need embeddings. We are done!');
      hasMore = false;
      break;
    }

    console.log(`Processing batch of ${stores.length} supply stores...`);

    for (const store of stores) {
      try {
        const bio = `${store.name} is a barber supply store located at ${store.formatted_address || store.city || 'Unknown'}.
        Categories: ${store.place_types || 'Barber Supply Store'}.
        Rating: ${store.rating || 'Unrated'} from ${store.total_reviews || 0} reviews.
        Price level: ${store.price_level || 'Unknown'}.`;

        const res = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: bio,
          config: { outputDimensionality: 768 }
        });

        const embedding = res.embeddings[0].values;

        const { error: updateError } = await supabase
          .from('agent_barber_supply_store_leads')
          .update({ embedding: `[${embedding.join(',')}]` })
          .eq('id', store.id);

        if (updateError) {
          console.error(`Error updating ${store.name}:`, updateError);
        } else {
          console.log(`Successfully updated ${store.name}`);
        }

        // Delay to respect rate limits
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`Failed to process ${store.name}:`, err);
      }
    }
  }
  console.log('Finished seeding ALL barber supply store embeddings!');
}

seedSupplyStoreEmbeddings();
