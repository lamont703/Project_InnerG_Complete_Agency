const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchool() {
  const { data, error } = await supabase
    .from('barber_schools')
    .select('id, name')
    .eq('id', '8fc9585a-625c-4c79-aa6c-c39e214f2147')
    .single()

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('School Found:', data)
  }
}

checkSchool()
