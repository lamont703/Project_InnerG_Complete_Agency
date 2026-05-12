const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProject() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, slug, school_id')
    .eq('id', 'e782837d-102d-49ad-becf-0bd928cbdcb9')
    .single()

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Project Found:', data)
    
    if (data.school_id) {
       const { data: school } = await supabase
         .from('barber_schools')
         .select('name')
         .eq('id', data.school_id)
         .single()
       console.log('Linked School:', school?.name)
    }
  }
}

checkProject()
