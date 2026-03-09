const { createClient } = require('@supabase/supabase-js')

// Pull from standard env placeholders as a hack
const supabaseUrl = 'https://senkwhdxgtypcrtoggyf.supabase.co'
const serviceRoleKey = 'YOUR_KEY_HERE'

// Actually I'll use list_dir or find_by_name to find if there is a .env file
