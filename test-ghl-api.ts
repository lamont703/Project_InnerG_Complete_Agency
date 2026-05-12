import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { load } from 'https://deno.land/std/dotenv/mod.ts';

const env = await load({ envPath: './.env.local' });
const GHL_API_KEY = env['GHL_API_KEY'] || '123';
const GHL_LOCATION_ID = env['GHL_LOCATION_ID'] || '456';
const GHL_API_BASE = "https://services.leadconnectorhq.com";

const headers = {
    Authorization: `Bearer ${GHL_API_KEY}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
};

async function test() {
    console.log('Testing GHL API...');
    
    // 1. Try URL path
    let url = `${GHL_API_BASE}/social-media-posting/${GHL_LOCATION_ID}/accounts`;
    let res = await fetch(url, { headers });
    console.log(`PATH: ${res.status} ${res.statusText}`);
    try { console.log(await res.json()); } catch(e) { console.log("NO JSON"); }

    // 2. Try URL param
    if(!res.ok) {
        url = `${GHL_API_BASE}/social-media-posting/accounts?locationId=${GHL_LOCATION_ID}`;
        res = await fetch(url, { headers });
        console.log(`PARAM: ${res.status} ${res.statusText}`);
        try { console.log(await res.json()); } catch(e) { console.log("NO JSON"); }
    }
}

test();
