require('dotenv').config({ path: '.env.local' });
const apiKey = process.env.GHL_API_KEY || '';
const locationId = 'QLyYYRoOhCg65lKW9HDX';

async function run() {
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28' };

    console.log('Testing GET posts with query args ...');
    let url = `https://services.leadconnectorhq.com/social-media-posting/${locationId}/posts?type=all&skip=0&limit=10&includeUsers=true`;
    let r1 = await fetch(url, { headers });
    console.log('STATUS:', r1.status);
    try { console.log(await r1.json()); } catch (e) {}
}
run();
