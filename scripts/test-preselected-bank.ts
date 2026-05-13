import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const studentId = "559d8265-4cda-4721-afd9-cf3fc83b2bbc"; // Your test student ID

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPreselectedBank() {
  console.log(`📡 [DIAGNOSTIC] Querying Preselected Bank for Student: ${studentId}...`);
  
  const { data, error } = await supabase.rpc('get_preselected_question_bank', { 
    p_student_id: studentId 
  });

  if (error) {
    console.error("❌ [ERROR]", error.message);
    return;
  }

  console.log(`✅ [SUCCESS] Found ${data.length} preselected questions.`);
  
  // Show a sample of the first 5
  console.log("\n--- PRESELECTED SAMPLE ---");
  data.slice(0, 5).forEach((q: any, i: number) => {
    console.log(`${i+1}. [${q.domain}] ${q.question.slice(0, 60)}...`);
  });
  
  console.log("\n--------------------------");
  console.log("💡 VERIFICATION: These questions should all be is_verified: true and not answered correctly in the last 7 days.");
}

testPreselectedBank();
