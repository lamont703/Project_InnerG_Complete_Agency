const fs = require('fs');
const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length > 1 && !line.startsWith('#')) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const apiKey = 'pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4'; // from user
const locationId = 'QLyYYRoOhCg65lKW9HDX'; // from user

async function run() {
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28' };

    // Try GET /social-media-posting/posts
    console.log('Fetching GET posts form 1...');
    const r1 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/posts?locationId=${locationId}`, { headers });
    console.log('R1 status:', r1.status);
    try { console.log('R1 body:', await r1.json()); } catch(e) {}

    console.log('Fetching GET posts form 2...');
    const r2 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/${locationId}/posts`, { headers });
    console.log('R2 status:', r2.status);
    try { console.log('R2 body:', await r2.json()); } catch(e) {}
}
run();
