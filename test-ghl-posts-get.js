require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GHL_API_KEY || '';
const locationId = 'QLyYYRoOhCg65lKW9HDX';

async function run() {
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28' };

    console.log('Testing GET posts alternate 3 ...');
    let r2 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/posts?locationId=${locationId}`, { headers: { ...headers } });
    console.log('STATUS:', r2.status);
    try { console.log(await r2.json()); } catch (e) {}
}
run();
