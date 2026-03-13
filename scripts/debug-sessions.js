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

async function checkSessions() {
    const env = getEnv();
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('project_id', '00000000-0000-0000-0000-000000000001')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching sessions:', error);
    } else {
        console.log('Recent Agency Sessions:', JSON.stringify(data, null, 2));
    }
}

checkSessions();
