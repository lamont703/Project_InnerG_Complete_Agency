const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length > 1 && !line.startsWith('#')) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const sbUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const sbKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(sbUrl, sbKey);

async function run() {
    const { data: conn, error } = await supabase.from('client_db_connections').select('*').eq('id', '320dadf7-ff31-4ac9-bd5d-dfd169ad4f4d').limit(1);
    
    if (conn && conn[0] && conn[0].sync_config) {
        const apiKey = conn[0].sync_config.api_key;
        const locationId = conn[0].sync_config.location_id;
        console.log("Found config. locationId:", locationId, "apiKey:", apiKey.substring(0, 5) + "...");

        const headers = { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28' };

        console.log('Fetching path...');
        const r1 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/${locationId}/accounts`, { headers });
        console.log('R1 status:', r1.status);
        try { console.log('R1 body:', await r1.json()); } catch(e) {}

        console.log('Fetching param...');
        const r2 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/accounts?locationId=${locationId}`, { headers });
        console.log('R2 status:', r2.status);
        try { console.log('R2 body:', await r2.json()); } catch(e) {}
    } else {
        console.log('No conn found', error, conn);
    }
}
run();
