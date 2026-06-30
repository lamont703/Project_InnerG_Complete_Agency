const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function seedBarbers() {
  console.log('Starting seed process for all remaining barbers...');
  
  let hasMore = true;
  while (hasMore) {
    // Fetch barbers that don't have embeddings yet
    const { data: barbers, error } = await supabase
      .from('agent_barber_leads')
      .select('*')
      .is('embedding', null)
      .limit(100); 
      
    if (error) {
      console.error('Error fetching barbers:', error);
      break;
    }
    
    if (!barbers || barbers.length === 0) {
      console.log('No barbers found that need embeddings. We are done!');
      hasMore = false;
      break;
    }
    
    console.log(`Processing batch of ${barbers.length} barbers...`);
    
    for (const barber of barbers) {
      try {
        const bio = `${barber.name} is a ${barber.specialty_type || 'Professional'} based in ${barber.metro_area || barber.address || 'Unknown'}. 
        Status: ${barber.status || 'Unknown'}. Looking for placement: ${barber.is_actively_looking ? 'Yes' : 'No'}.
        Desired pay structure: ${barber.desired_pay_structure || 'Flexible'}.
        Skills: ${barber.desired_specialties || 'General Barbering'}.`;
        
        const res = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: bio,
          config: { outputDimensionality: 768 }
        });
        
        const embedding = res.embeddings[0].values;
        
        const { error: updateError } = await supabase
          .from('agent_barber_leads')
          .update({ embedding: `[${embedding.join(',')}]` })
          .eq('id', barber.id);
        
        if (updateError) {
          console.error(`Error updating ${barber.name}:`, updateError);
        } else {
          console.log(`Successfully updated ${barber.name}`);
        }
        
        // Delay to respect rate limits
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`Failed to process ${barber.name}:`, err);
      }
    }
  }
  console.log('Finished seeding ALL barber embeddings!');
}

seedBarbers();
