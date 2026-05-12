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
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env vars');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('social_content_plan')
        .select('id, platform, status, created_at, content_text, project_id')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching drafts:', error);
    } else {
        console.log('Recent Social Drafts:');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkDrafts();
