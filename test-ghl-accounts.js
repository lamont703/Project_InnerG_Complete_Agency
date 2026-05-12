require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Because we don't have SUPABASE_SERVICE_ROLE_KEY locally, we'll try Anon key
const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(sbUrl, sbKey);

async function run() {
    const { data: conn, error } = await supabase.from('client_db_connections').select('*').eq('id', '320dadf7-ff31-4ac9-bd5d-dfd169ad4f4d').limit(1);
    
    if (error) {
        console.error("Supabase Error:", error);
    }
    
    if (conn && conn[0] && conn[0].sync_config) {
        const apiKey = conn[0].sync_config.api_key;
        const locationId = conn[0].sync_config.location_id;
        console.log("Found config. locationId:", locationId);

        if (!apiKey) { console.log('NO API KEY'); return; }

        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Version': '2021-07-28'
        };

        const r1 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/${locationId}/accounts`, { headers });
        console.log('r1 status:', r1.status);
        try { console.log('r1 body:', await r1.json()); } catch(e) {}

        const r2 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/accounts?locationId=${locationId}`, { headers });
        console.log('r2 status:', r2.status);
        try { console.log('r2 body:', await r2.json()); } catch(e) {}
    } else {
        console.log("No connection found for that ID or missing sync_config", conn);
    }
}
run();
