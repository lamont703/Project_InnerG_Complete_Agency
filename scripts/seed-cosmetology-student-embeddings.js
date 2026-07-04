const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function seedStudentEmbeddings() {
  console.log('Starting seed process for all remaining cosmetology student exam records...');

  let hasMore = true;
  let totalDone = 0;
  while (hasMore) {
    const { data: rows, error } = await supabase
      .from('agent_cosmetology_student_leads')
      .select('*')
      .is('embedding', null)
      .limit(100);

    if (error) {
      console.error('Error fetching records:', error);
      break;
    }

    if (!rows || rows.length === 0) {
      console.log('No records found that need embeddings. We are done!');
      hasMore = false;
      break;
    }

    console.log(`Processing batch of ${rows.length} records... (done so far: ${totalDone})`);

    for (const rec of rows) {
      try {
        const attemptPhrase = rec.attempt_number > 1
          ? `This was their attempt #${rec.attempt_number} at this exam.`
          : 'This was their first attempt at this exam.';

        const bio = `${rec.first_name} ${rec.last_name} took the TX Cosmetology Operator ${rec.test_type} English exam at ${rec.school_name} on ${rec.test_date}, and ${rec.result === 'PASS' ? 'passed' : 'failed'} with a score of ${rec.score}%. ${attemptPhrase}`;

        const res = await ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: bio,
          config: { outputDimensionality: 768 }
        });

        const embedding = res.embeddings[0].values;

        const { error: updateError } = await supabase
          .from('agent_cosmetology_student_leads')
          .update({ embedding: `[${embedding.join(',')}]` })
          .eq('id', rec.id);

        if (updateError) {
          console.error(`Error updating ${rec.first_name} ${rec.last_name}:`, updateError);
        }
        totalDone++;

        await new Promise((r) => setTimeout(r, 150));
      } catch (err) {
        console.error(`Failed to process ${rec.first_name} ${rec.last_name}:`, err);
      }
    }
    console.log(`  Batch done. Total: ${totalDone}`);
  }
  console.log('Finished seeding ALL cosmetology student exam record embeddings!');
}

seedStudentEmbeddings();
