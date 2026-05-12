const apiKey = 'pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4';
const locationId = 'QLyYYRoOhCg65lKW9HDX';

async function run() {
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' };
    
    const fetchBody = {
        profileIds: [
            "69211651e1ea9f173fb58b2c",
            "68fd8ccf0f1ecf5ab307bda9",
            "65c303f10840ba03b2d99b00"
        ],
        days: 90,
        range: "90d"
    };

    console.log('\nTesting POST to /social-media-posting/statistics?locationId= with range/days');
    let r2 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/statistics?locationId=${locationId}`, { 
        method: 'POST', headers, body: JSON.stringify(fetchBody) 
    });
    console.log('STATUS:', r2.status);
    try { console.log(await r2.json()); } catch (e) {}
}
run();
