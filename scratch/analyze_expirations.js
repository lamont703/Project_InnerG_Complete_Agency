const fs = require('fs');

async function analyzeExpirations() {
    const apiSchoolsPath = '/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Texas_API_Barber_Schools.json';
    const apiSchools = JSON.parse(fs.readFileSync(apiSchoolsPath, 'utf8'));
    
    const now = new Date();
    console.log(`Current Date: ${now.toISOString()}`);
    
    let expired = 0;
    let active = 0;
    const sampleExpirations = [];

    for (const school of apiSchools) {
        const expDate = new Date(school.license_expiration_date_mmddccyy);
        if (expDate < now) {
            expired++;
        } else {
            active++;
        }
        sampleExpirations.push(school.license_expiration_date_mmddccyy);
    }

    console.log(`Summary:`);
    console.log(`Active: ${active}`);
    console.log(`Expired: ${expired}`);
    console.log(`Total: ${apiSchools.length}`);
    
    console.log('\nSample Expiration Dates:');
    console.log(sampleExpirations.slice(0, 10).join(', '));
}

analyzeExpirations();
