import { createAdminClient } from "./lib/supabase/admin";

async function fixRecord() {
  const supabase = createAdminClient();
  const { error } = await (supabase
    .from("barber_registrations") as any)
    .update({ 
      project_id: '1d76c24e-e695-4c70-ba44-137c7b269e49',
      status: 'deployed'
    })
    .eq('id', 'e4227ca3-5045-44db-8652-671a8d910b0c');

  if (error) {
    console.error("Error fixing record:", error);
  } else {
    console.log("Record fixed successfully!");
  }
}

fixRecord();
