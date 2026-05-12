const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function getEnv() {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const lines = envFile.split('\n');
    const env = {};
    lines.forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
    return env;
}

async function checkDrafts() {
    const env = getEnv();
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    // Try both names
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Using URL:', supabaseUrl);
    // Be careful not to leak the real key in logs if it were a production environment, 
    // but here I need to debug. I'll just check if it exists.
    console.log('Key exists:', !!supabaseKey);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: countData } = await supabase.from('social_content_plan').select('count', { count: 'exact' });
    console.log('Total drafts count:', countData);

    const { data, error } = await supabase
        .from('social_content_plan')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching drafts:', error);
    } else {
        console.log('Recent Drafts:', JSON.stringify(data, null, 2));
    }
}

checkDrafts();
