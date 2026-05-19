require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

async function pullAllSchools() {
  const keyID = process.env.TexasBarberCosApiKeyID;
  const keySecret = process.env.TexasBarberCosApiKeySecret;
  const url = 'https://data.texas.gov/api/v3/views/7358-krk7/query.json';
  const auth = Buffer.from(`${keyID}:${keySecret}`).toString('base64');

  console.log('Pulling ALL potential Barber/Cosmetology schools...');

  const query = {
    query: "SELECT * WHERE `license_type` IN ('Barber School', 'Cosmetology Private School', 'Cosmetology Junior College', 'Cosmetology Public School') LIMIT 2000",
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify(query)
    });

    const data = await response.json();
    console.log(`Pulled ${data.length} schools.`);
    
    fs.writeFileSync('/Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Texas_API_All_Schools.json', JSON.stringify(data, null, 2));
    console.log('Saved to /Users/lamontevans/Desktop/AI_Blockchain_Enterprise_Services/public/Texas_API_All_Schools.json');

    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

pullAllSchools();
