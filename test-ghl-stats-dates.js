const apiKey = 'pit-96f9b0b9-c512-4066-81b6-d74ac075d8d4';
const locationId = 'QLyYYRoOhCg65lKW9HDX';

async function run() {
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Version': '2021-07-28', 'Content-Type': 'application/json' };
    
    // 90 days ago
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 90);
    
    const fetchBody = {
        profileIds: [
            "69211651e1ea9f173fb58b2c",
            "68fd8ccf0f1ecf5ab307bda9",
            "65c303f10840ba03b2d99b00"
        ],
        // let's try some common date properties
        startDate: fromDate.getTime(),
        endDate: toDate.getTime(),
        startDateStr: fromDate.toISOString(),
        endDateStr: toDate.toISOString(),
        from: fromDate.toISOString(),
        to: toDate.toISOString()
    };

    console.log('\nTesting POST to /social-media-posting/statistics?locationId= with dates');
    let r2 = await fetch(`https://services.leadconnectorhq.com/social-media-posting/statistics?locationId=${locationId}`, { 
        method: 'POST', headers, body: JSON.stringify(fetchBody) 
    });
    console.log('STATUS:', r2.status);
    try { console.log(await r2.json()); } catch (e) {}
}
run();
