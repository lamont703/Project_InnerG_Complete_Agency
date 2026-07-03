const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function seedSchools() {
  console.log('Starting seed process for all remaining barber schools...');

  let hasMore = true;
  while (hasMore) {
    const { data: schools, error } = await supabase
      .from('agent_barber_school_leads')
      .select('*')
      .is('embedding', null)
      .limit(100);

    if (error) {
      console.error('Error fetching schools:', error);
      break;
    }

    if (!schools || schools.length === 0) {
      console.log('No schools found that need embeddings. We are done!');
      hasMore = false;
      break;
    }

    console.log(`Processing batch of ${schools.length} schools...`);

    for (const school of schools) {
      try {
        const bio = `${school.school_name} is a barber/cosmetology school in ${school.city || school.formatted_address || 'Texas'}.
        Accreditation: ${school.accreditation_status || 'Unknown'}${school.accreditor_name ? ` (${school.accreditor_name})` : ''}.
        Rating: ${school.rating || 'Unrated'}.
        ${school.annual_tuition ? `Annual tuition: $${school.annual_tuition}.` : ''}
        ${school.state_pass_rate ? `State board pass rate: ${school.state_pass_rate}.` : ''}
        ${school.completion_rate ? `Completion rate: ${Math.round(school.completion_rate * 100)}%.` : ''}`;

        const res = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: bio,
          config: { outputDimensionality: 768 }
        });

        const embedding = res.embeddings[0].values;

        const { error: updateError } = await supabase
          .from('agent_barber_school_leads')
          .update({ embedding: `[${embedding.join(',')}]` })
          .eq('id', school.id);

        if (updateError) {
          console.error(`Error updating ${school.school_name}:`, updateError);
        } else {
          console.log(`Successfully updated ${school.school_name}`);
        }

        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`Failed to process ${school.school_name}:`, err);
      }
    }
  }
  console.log('Finished seeding ALL school embeddings!');
}

seedSchools();
