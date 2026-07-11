require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GHL_API_KEY || '';
const locationId = 'QLyYYRoOhCg65lKW9HDX';

async function run() {
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' };
    const fetchBody = {
        "type": "all",
        "accounts": "69211644e1ea9f528eb585f7_QLyYYRoOhCg65lKW9HDX_hd1PfCiHkw_profile",
        "skip": "0",
        "limit": "10",
        "fromDate": "2024-01-22T05:32:49.463Z",
        "toDate": (new Date()).toISOString(),
        "includeUsers": "true",
        "postType": "post"
    };

    console.log('\nTesting POST /social-media-posting/{locationId}/posts/list');
    let r3 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/${locationId}/posts/list`, { 
        method: 'POST', headers, body: JSON.stringify(fetchBody) 
    });
    console.log('POST LIST STATUS:', r3.status);
    try { console.log(await r3.json()); } catch (e) {}
}
run();
