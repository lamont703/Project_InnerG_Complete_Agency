const apiKey = 'pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4';
const locationId = 'QLyYYRoOhCg65lKW9HDX';

async function run() {
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28' };
    
    // Per user, it says "SEND API REQUEST. RESPONSE: 201". But no path is given...
    // wait, what is the GET requests path?
    console.log('Testing GET /social-media-posting/list ...');
    let r2 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/list?locationId=${locationId}`, { 
        method: "GET", headers 
    });
    console.log('STATUS:', r2.status);
    try { console.log(await r2.json()); } catch (e) {}

    console.log('Testing POST /social-media-posting ...');
    let r3 = await fetch(`https://services.leadconnectorhq.com/social-media-posting?locationId=${locationId}`, { 
        method: "POST", headers, body: JSON.stringify({ type: "all", skip: "0", limit: "10" }), headers: {...headers, 'Content-Type': 'application/json'}
    });
    console.log('STATUS:', r3.status);
    try { console.log(await r3.json()); } catch (e) {}

    console.log('Testing GET https://services.leadconnectorhq.com/social-media-posting/posts/list ...');
    let r4 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/posts/list?locationId=${locationId}`, { headers });
    console.log('STATUS:', r4.status);
    try { console.log(await r4.json()); } catch(e){}
}
run();
